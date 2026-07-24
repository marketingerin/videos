"""Gera um draft do CapCut a partir de video, audio e legenda (srt) opcionais.

Uso (Mac):
    python scripts/generate_draft.py \
        --draft-folder ~/Movies/CapCut/"User Data"/Projects/com.lveditor.draft \
        --name meu_video \
        --video assets/video.mp4

Uso (Windows):
    python scripts/generate_draft.py \
        --draft-folder "%LOCALAPPDATA%\\CapCut\\User Data\\Projects\\com.lveditor.draft" \
        --name meu_video \
        --video assets/video.mp4 \
        --audio assets/audio.mp3 \
        --srt assets/legenda.srt

Por padrao o canvas do projeto segue a resolucao do proprio video de origem
(entao um video vertical 9:16 vira um projeto vertical). Use --aspect ou
--width/--height para forcar outra proporcao.

O draft gerado precisa ser aberto no CapCut Desktop para revisao, ajustes
finais e exportacao do video renderizado.
"""

import argparse
import json
import os
import shutil
import sys
import time
import uuid

try:
    import pymediainfo
    import pycapcut as cc
    from pycapcut import trange
except ImportError as exc:
    print(
        f"Dependencia do projeto nao encontrada ({exc}). "
        "Ative o .venv do projeto (source .venv/bin/activate no Mac/Linux, "
        ".venv\\Scripts\\activate no Windows) e rode 'pip install -r requirements.txt', "
        "depois tente novamente.",
        file=sys.stderr,
    )
    sys.exit(1)

# Proporcoes de entrega comuns -> (largura, altura) em px.
ASPECT_PRESETS = {
    "9:16": (1080, 1920),  # Reels / TikTok / Shorts (vertical)
    "16:9": (1920, 1080),  # YouTube / TV (horizontal)
    "1:1": (1080, 1080),   # feed quadrado
    "4:5": (1080, 1350),   # feed retrato Instagram/Facebook
}


def _fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def _require_file(path: str, label: str) -> str:
    resolved = os.path.abspath(os.path.expanduser(path))
    if not os.path.isfile(resolved):
        _fail(f"Arquivo nao encontrado ({label}): {resolved}")
    return resolved


def _resolve_canvas(video_material, width, height, aspect) -> tuple[int, int]:
    """Decide a resolucao do canvas: --width/--height > --aspect > resolucao do video."""
    if width and height:
        return width, height
    if aspect:
        return ASPECT_PRESETS[aspect]
    # Padrao: seguir a origem, para que vertical continue vertical.
    return video_material.width, video_material.height


def _stamp_platform_and_id(script) -> None:
    """Da a cada draft um id unico e carimba a plataforma real.

    O template do pycapcut traz um id fixo e os=windows; sem isso todo draft
    gerado teria o mesmo draft_id (colidindo no CapCut em modo lote) e ficaria
    marcado como Windows mesmo rodando no Mac.
    """
    script.content["id"] = str(uuid.uuid4()).upper()
    if sys.platform == "darwin":
        os_name = "mac"
    elif sys.platform == "win32":
        os_name = "windows"
    else:
        os_name = script.content.get("platform", {}).get("os", "windows")
    for key in ("platform", "last_modified_platform"):
        block = script.content.get(key)
        if isinstance(block, dict):
            block["os"] = os_name


def _populate_meta_info(project_dir: str, name: str, duration_us: int) -> None:
    """Preenche o draft_meta_info.json (que o pycapcut deixa em branco).

    O CapCut monta o card em "Meus projetos" a partir desse arquivo; se ele
    fica vazio (sem nome, sem caminho, sem id unico), o projeto pode nao
    aparecer ou aparecer quebrado. Damos um draft_id unico por draft e
    apontamos os caminhos para a pasta real.
    """
    meta_path = os.path.join(project_dir, "draft_meta_info.json")
    if not os.path.isfile(meta_path):
        return
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    meta["draft_id"] = str(uuid.uuid4()).upper()
    meta["draft_name"] = name
    meta["draft_fold_path"] = project_dir
    meta["draft_root_path"] = project_dir
    meta["tm_duration"] = int(duration_us)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=4)


def build_draft(
    draft_folder: str,
    name: str,
    video: str,
    audio: str | None,
    srt: str | None,
    width: int | None = None,
    height: int | None = None,
    aspect: str | None = None,
    fps: int = 30,
) -> str:
    draft_folder = os.path.abspath(os.path.expanduser(draft_folder))
    if not os.path.isdir(draft_folder):
        _fail(
            f"Pasta de drafts do CapCut nao encontrada: {draft_folder}. "
            "Abra o CapCut ao menos uma vez para criar a pasta de projetos, "
            "ou confira o caminho (Configuracoes > Local de rascunhos no CapCut)."
        )

    folder = cc.DraftFolder(draft_folder)

    # Ler o material antes de criar o draft, para o canvas poder seguir a origem.
    video_material = cc.VideoMaterial(video)
    canvas_w, canvas_h = _resolve_canvas(video_material, width, height, aspect)

    script = folder.create_draft(name, canvas_w, canvas_h, fps, allow_replace=True)
    _stamp_platform_and_id(script)
    script.add_track(cc.TrackType.video)

    video_segment = cc.VideoSegment(video_material, trange("0s", video_material.duration))
    script.add_segment(video_segment)

    if audio:
        script.add_track(cc.TrackType.audio)
        audio_material = cc.AudioMaterial(audio)
        # O trecho de audio nao pode passar da duracao real do audio, senao o
        # pycapcut lanca erro. Limitamos ao menor entre video e audio.
        seg_dur = min(video_segment.duration, audio_material.duration)
        if audio_material.duration < video_segment.duration:
            print(
                f"Aviso: o audio ({audio_material.duration / 1_000_000:.1f}s) e mais curto que "
                f"o video ({video_segment.duration / 1_000_000:.1f}s); o audio vai ate "
                f"{seg_dur / 1_000_000:.1f}s e o restante do video fica sem trilha."
            )
        audio_segment = cc.AudioSegment(audio_material, trange("0s", seg_dur))
        audio_segment.add_fade("1s", "1s")
        script.add_segment(audio_segment)

    if srt:
        try:
            script.import_srt(srt, track_name="legenda")
        except ValueError as exc:
            _fail(
                f"Arquivo .srt malformado (verifique numeracao e timestamps): {srt}\n"
                f"Detalhe: {exc}"
            )

    script.save()

    project_dir = os.path.dirname(script.save_path)
    _populate_meta_info(project_dir, name, script.duration)

    if sys.platform == "darwin":
        # CapCut Desktop no Mac le "draft_info.json" (mesmo schema, nome diferente do Windows).
        shutil.copy(script.save_path, os.path.join(project_dir, "draft_info.json"))

    return script.save_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--draft-folder", required=True, help="Pasta de drafts do CapCut Desktop")
    parser.add_argument("--name", required=True, help="Nome do draft/projeto")
    parser.add_argument("--video", required=True, help="Caminho do arquivo de video principal")
    parser.add_argument("--audio", help="Caminho do arquivo de audio (opcional)")
    parser.add_argument("--srt", help="Caminho do arquivo .srt de legenda (opcional)")
    parser.add_argument("--aspect", choices=sorted(ASPECT_PRESETS), help="Proporcao do canvas (padrao: segue o video de origem)")
    parser.add_argument("--width", type=int, help="Largura do canvas em px (sobrepoe --aspect; exige --height)")
    parser.add_argument("--height", type=int, help="Altura do canvas em px (sobrepoe --aspect; exige --width)")
    parser.add_argument("--fps", type=int, default=30, help="Frames por segundo do projeto (padrao: 30)")
    args = parser.parse_args()

    if bool(args.width) != bool(args.height):
        _fail("Use --width e --height juntos (ou nenhum dos dois).")

    if not pymediainfo.MediaInfo.can_parse():
        _fail(
            "Biblioteca nativa MediaInfo (libmediainfo) nao pode ser carregada, sem ela nao da "
            "para ler a duracao/resolucao dos arquivos. No Mac: 'brew install mediainfo'. "
            "No Linux: instale o pacote 'libmediainfo'. No Windows: garanta que 'MediaInfo.dll' "
            "esteja disponivel. Confira tambem se a arquitetura do Python e da biblioteca coincidem."
        )

    video = _require_file(args.video, "--video")
    audio = _require_file(args.audio, "--audio") if args.audio else None
    srt = _require_file(args.srt, "--srt") if args.srt else None

    path = build_draft(
        args.draft_folder,
        args.name,
        video,
        audio,
        srt,
        width=args.width,
        height=args.height,
        aspect=args.aspect,
        fps=args.fps,
    )
    print(f"Draft criado em: {path}")
    if sys.platform == "darwin":
        print(
            "Dica: se o projeto nao aparecer em 'Meus projetos', feche e reabra o CapCut "
            "(ele so escaneia a pasta de projetos ao iniciar)."
        )


if __name__ == "__main__":
    main()

"""Gera um draft do CapCut a partir de video, audio e legenda (srt) opcionais.

Uso (Windows):
    python scripts/generate_draft.py \
        --draft-folder "C:\\Users\\<voce>\\AppData\\Local\\CapCut\\User Data\\Projects\\com.lveditor.draft" \
        --name meu_video \
        --video assets/video.mp4 \
        --audio assets/audio.mp3 \
        --srt assets/legenda.srt

Uso (Mac):
    python scripts/generate_draft.py \
        --draft-folder ~/Movies/CapCut/"User Data"/Projects/com.lveditor.draft \
        --name meu_video \
        --video assets/video.mp4

O draft gerado precisa ser aberto no CapCut Desktop para revisao, ajustes
finais e exportacao do video renderizado.
"""

import argparse
import shutil
import sys

import pycapcut as cc
from pycapcut import trange


def build_draft(draft_folder: str, name: str, video: str, audio: str | None, srt: str | None) -> str:
    folder = cc.DraftFolder(draft_folder)
    script = folder.create_draft(name, 1920, 1080, allow_replace=True)
    script.add_track(cc.TrackType.video)

    video_material = cc.VideoMaterial(video)
    video_segment = cc.VideoSegment(video_material, trange("0s", video_material.duration))
    script.add_segment(video_segment)

    if audio:
        script.add_track(cc.TrackType.audio)
        audio_segment = cc.AudioSegment(audio, trange("0s", video_segment.duration))
        audio_segment.add_fade("1s", "1s")
        script.add_segment(audio_segment)

    if srt:
        script.import_srt(srt, track_name="legenda")

    script.save()

    if sys.platform == "darwin":
        # CapCut Desktop no Mac le "draft_info.json" (mesmo schema, nome diferente do Windows).
        shutil.copy(script.save_path, script.save_path.replace("draft_content.json", "draft_info.json"))

    return script.save_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft-folder", required=True, help="Pasta de drafts do CapCut Desktop")
    parser.add_argument("--name", required=True, help="Nome do draft/projeto")
    parser.add_argument("--video", required=True, help="Caminho do arquivo de video principal")
    parser.add_argument("--audio", help="Caminho do arquivo de audio (opcional)")
    parser.add_argument("--srt", help="Caminho do arquivo .srt de legenda (opcional)")
    args = parser.parse_args()

    path = build_draft(args.draft_folder, args.name, args.video, args.audio, args.srt)
    print(f"Draft criado em: {path}")


if __name__ == "__main__":
    main()

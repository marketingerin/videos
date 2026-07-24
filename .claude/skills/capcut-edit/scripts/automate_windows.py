"""Automatiza abrir e exportar um projeto no CapCut Desktop (Windows) via cliques simulados.

Pressupoe que:
  - O CapCut Desktop ja esta aberto e visivel (rode launch_capcut.py antes e
    espere a janela carregar).
  - O projeto que voce quer abrir e o mais recente em "Meus projetos" (e o
    caso logo depois de gerar um draft novo com generate_draft.py, ja que o
    CapCut ordena por data de modificacao).
  - Existe um arquivo de calibracao gerado por calibrate_windows.py.

Uso:
    python automate_windows.py --config capcut_gui_config.json [--export-wait 120] [--dry-run]

Nao ha como o CapCut avisar programaticamente quando a exportacao termina
(sem API) - o script espera um tempo fixo (--export-wait, em segundos) antes
de clicar em fechar. Ajuste esse valor para a duracao real dos seus videos;
se for curto demais, o script clica em "fechar" antes da exportacao acabar.
"""

import argparse
import json
import sys
import time

try:
    import pyautogui
except ImportError:
    print("Este script precisa do pacote 'pyautogui': pip install pyautogui")
    sys.exit(1)


def load_config(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def click_point(config: dict, name: str, dry_run: bool) -> None:
    point = config.get(name)
    if not point:
        print(f"Ponto '{name}' nao encontrado na configuracao. Rode calibrate_windows.py de novo.")
        sys.exit(1)
    print(f"Clicando em '{name}' ({point['x']}, {point['y']})" + (" [dry-run]" if dry_run else ""))
    if not dry_run:
        pyautogui.click(point["x"], point["y"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, help="Arquivo JSON gerado por calibrate_windows.py")
    parser.add_argument("--export-wait", type=int, default=120, help="Segundos a esperar a exportacao terminar")
    parser.add_argument("--dry-run", action="store_true", help="So mostra o que faria, sem clicar de verdade")
    args = parser.parse_args()

    if sys.platform != "win32":
        print("Aviso: este script foi escrito para o CapCut Desktop no Windows; noutras plataformas o comportamento nao e garantido.")

    config = load_config(args.config)

    click_point(config, "open_first_project", args.dry_run)
    time.sleep(3)

    click_point(config, "export_button", args.dry_run)
    time.sleep(2)

    click_point(config, "export_confirm_button", args.dry_run)
    print(f"Aguardando ate {args.export_wait}s para a exportacao terminar...")
    if not args.dry_run:
        time.sleep(args.export_wait)

    click_point(config, "export_done_close_button", args.dry_run)
    print("Concluido. Confira o arquivo exportado para confirmar que a exportacao realmente terminou.")


if __name__ == "__main__":
    main()

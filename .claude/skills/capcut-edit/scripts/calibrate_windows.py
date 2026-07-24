"""Calibracao interativa de coordenadas de tela para automatizar o CapCut Desktop (Windows).

Precisa rodar numa sessao Windows de verdade, com o CapCut Desktop aberto e
visivel na tela (nao funciona sem monitor/mouse reais - por isso nao roda
num ambiente remoto/headless).

Uso:
    python calibrate_windows.py --output capcut_gui_config.json

Para cada ponto pedido, posicione o mouse em cima do elemento indicado no
CapCut e pressione Enter no terminal (sem mover o mouse antes de apertar
Enter). O script grava a posicao atual do cursor.
"""

import argparse
import json
import sys

try:
    import pyautogui
except ImportError:
    print("Este script precisa do pacote 'pyautogui': pip install pyautogui")
    sys.exit(1)

POINTS = [
    ("open_first_project", "o primeiro projeto (mais recente) na lista 'Meus projetos'"),
    ("export_button", "o botao 'Exportar' dentro do editor de um projeto aberto"),
    ("export_confirm_button", "o botao de confirmar/iniciar a exportacao na janela que abre depois de clicar em Exportar"),
    ("export_done_close_button", "o botao de fechar/OK que aparece quando a exportacao termina"),
]


def capture_point(label: str, description: str) -> dict:
    input(f"Posicione o mouse sobre: {description} ({label}) e pressione Enter...")
    x, y = pyautogui.position()
    print(f"  -> capturado {label} = ({x}, {y})")
    return {"x": x, "y": y}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="capcut_gui_config.json", help="Arquivo JSON de saida")
    args = parser.parse_args()

    if sys.platform != "win32":
        print("Aviso: este script foi escrito para calibrar o CapCut Desktop no Windows.")

    print("Calibracao do CapCut Desktop - siga as instrucoes para cada ponto.\n")
    config = {name: capture_point(name, desc) for name, desc in POINTS}

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"\nConfiguracao salva em {args.output}")
    print(
        "Se a resolucao da tela, o tamanho da janela do CapCut ou a versao do app mudarem, "
        "rode esta calibracao de novo."
    )


if __name__ == "__main__":
    main()

"""Encontra e abre o CapCut Desktop (Windows ou Mac).

Uso:
    python launch_capcut.py

Nao recebe argumentos: o CapCut, ao abrir, escaneia sozinho a pasta de
drafts e lista os projetos existentes em "Meus projetos".
"""

import glob
import os
import subprocess
import sys


def _version_key(path: str) -> list[int]:
    """Chave numerica a partir do nome da pasta de versao (o '*' do glob).

    Usar sort de string escolheria '2.9.0' como maior que '2.10.0'; comparar
    por inteiros garante que a versao realmente mais nova seja escolhida.
    """
    version_dir = os.path.basename(os.path.dirname(path))
    return [int(p) if p.isdigit() else 0 for p in version_dir.split(".")]


def find_windows_executable() -> str | None:
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    candidates = glob.glob(os.path.join(local_appdata, "CapCut", "Apps", "*", "CapCut.exe"))
    if not candidates:
        return None
    return max(candidates, key=_version_key)


def launch_windows() -> None:
    exe = find_windows_executable()
    if not exe:
        print(
            "Nao encontrei o executavel do CapCut em %LOCALAPPDATA%\\CapCut\\Apps\\*\\CapCut.exe. "
            "Abra o CapCut manualmente uma vez (isso confirma o caminho de instalacao) e rode de novo."
        )
        sys.exit(1)
    subprocess.Popen([exe])
    print(f"CapCut iniciado: {exe}")


def launch_mac() -> None:
    result = subprocess.run(["open", "-a", "CapCut"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Nao consegui abrir o CapCut via 'open -a CapCut': {result.stderr.strip()}")
        sys.exit(1)
    print("CapCut iniciado.")


def main() -> None:
    if sys.platform == "win32":
        launch_windows()
    elif sys.platform == "darwin":
        launch_mac()
    else:
        print(f"Plataforma nao suportada para lançar o CapCut Desktop: {sys.platform}")
        sys.exit(1)


if __name__ == "__main__":
    main()

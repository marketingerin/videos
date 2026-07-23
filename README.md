# videos

Automacao de edicao de video no CapCut Desktop usando [pycapcut](https://github.com/GuanYixuan/pyCapCut).

## Como funciona

O CapCut nao tem API publica para automacao. A abordagem aqui e gerar
programaticamente o arquivo de draft (projeto) do CapCut — a mesma estrutura
que o app cria ao editar manualmente — para depois abrir e exportar no
CapCut Desktop.

- **O que este repo automatiza**: montagem do projeto (video, audio, legenda,
  fade de audio) via script Python.
- **O que ainda depende do app**: revisao visual e exportacao final do MP4.
  A exportacao automatizada por linha de comando so e suportada pelo CapCut
  Desktop no **Windows**.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Uso

```bash
python scripts/generate_draft.py \
  --draft-folder "C:\Users\<voce>\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft" \
  --name meu_video \
  --video assets/video.mp4 \
  --audio assets/audio.mp3 \
  --srt assets/legenda.srt
```

Isso cria uma pasta de draft dentro de `--draft-folder`. Abra o CapCut
Desktop e o projeto `meu_video` vai aparecer na lista de "Meus projetos"
pronto para revisao e exportacao.

`--audio` e `--srt` sao opcionais.

## Proximos passos possiveis

- Trocar `scripts/generate_draft.py` por um modo "template" (`load_template`),
  reaproveitando um projeto do CapCut ja montado e so trocando midia/texto.
- Empacotar em um servico (ex.: FastAPI) para gerar drafts sob demanda.
- Adicionar exportacao automatizada via CapCut Desktop no Windows.

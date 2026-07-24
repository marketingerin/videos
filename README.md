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
- **Compatibilidade com o CapCut do Mac**: o script ja faz o necessario para o
  projeto aparecer e abrir em "Meus projetos" no Mac — grava tambem o
  `draft_info.json` (nome que o CapCut Mac le, alem do `draft_content.json` do
  Windows), preenche o `draft_meta_info.json` (nome, caminho, duracao), gera um
  `draft_id` unico por draft (essencial para gerar varios em lote sem colisao)
  e carimba a plataforma como `mac`. Isso segue a documentacao/engenharia
  reversa do formato, mas **ainda nao foi validado num CapCut Mac real** por
  este ambiente nao ter o app — teste com um projeto de baixo risco primeiro e,
  se o projeto nao aparecer, feche e reabra o CapCut (ele so escaneia a pasta ao
  iniciar).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

No Mac, o `pycapcut` depende da lib nativa MediaInfo para ler duracao/resolucao
dos arquivos de midia:

```bash
brew install mediainfo
```

## Uso

Windows:

```bash
python scripts/generate_draft.py \
  --draft-folder "C:\Users\<voce>\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft" \
  --name meu_video \
  --video assets/video.mp4 \
  --audio assets/audio.mp3 \
  --srt assets/legenda.srt
```

Mac:

```bash
python scripts/generate_draft.py \
  --draft-folder ~/Movies/CapCut/"User Data"/Projects/com.lveditor.draft \
  --name meu_video \
  --video assets/video.mp4 \
  --audio assets/audio.mp3 \
  --srt assets/legenda.srt
```

Isso cria uma pasta de draft dentro de `--draft-folder`. Abra o CapCut
Desktop e o projeto `meu_video` vai aparecer na lista de "Meus projetos"
pronto para revisao e exportacao. Se nao aparecer no Mac, feche e reabra o
CapCut (ele so escaneia a pasta de projetos ao iniciar).

### Opcoes

- `--audio` e `--srt` sao opcionais.
- **Proporcao do canvas**: por padrao segue a resolucao do proprio video de
  origem (um Reel 1080x1920 vira um projeto vertical). Para reenquadrar numa
  proporcao especifica use `--aspect 9:16|16:9|1:1|4:5`, ou defina pixels
  exatos com `--width` + `--height` (juntos). `--fps` ajusta os quadros por
  segundo (padrao 30).
- Se o audio for mais curto que o video, o script avisa e a trilha vai ate onde
  o audio alcanca (nao quebra mais); se for mais longo, e cortado no tamanho do
  video.
- Caminhos com `~` e arquivos/pastas inexistentes dao mensagem clara em
  portugues em vez de erro cru.

## Automacao completa (skill `capcut-edit`)

Alem de gerar o draft, `.claude/skills/capcut-edit/` empacota o fluxo como uma
[skill do Claude Code](https://code.claude.com/docs) que tambem abre o CapCut
Desktop automaticamente e, no Windows apos uma calibracao unica, simula os
cliques para abrir o projeto gerado e exportar — ja que o CapCut nao tem API.
Veja `.claude/skills/capcut-edit/SKILL.md` para o fluxo completo e
`.claude/skills/capcut-edit/references/gui-automation.md` para como calibrar,
limitacoes (e por que a automacao de clique quebra facil) e troubleshooting.
Essa parte de automacao de clique so foi validada no Windows.

## Proximos passos possiveis

- Trocar `scripts/generate_draft.py` por um modo "template" (`load_template`),
  reaproveitando um projeto do CapCut ja montado e so trocando midia/texto.
- Empacotar em um servico (ex.: FastAPI) para gerar drafts sob demanda.
- Substituir a automacao de clique por pywinauto (identificacao de elementos
  via UI Automation), mais robusta a mudanca de resolucao/layout.

## Base de conhecimento

[`docs/video-editing-knowledge-base.md`](docs/video-editing-knowledge-base.md)
reune referencia de edicao de video do basico ao senior — fundamentos e
teoria de montagem, especificacoes tecnicas (frame rate, codecs, entrega),
correcao/gradacao de cor, audio, panorama de ferramentas/IA em 2026 e
edicao por genero/progressao de carreira. Serve de base para decisoes
futuras de automacao neste projeto (que tipo de edicao vale a pena
automatizar, terminologia esperada, etc.).

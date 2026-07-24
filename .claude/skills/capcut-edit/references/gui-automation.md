# Automação de GUI do CapCut Desktop — como funciona e limitações

## Por que isso existe

O CapCut não tem API pública. Depois de gerar o draft (Passo 1 da skill), o
projeto aparece pronto em "Meus projetos" — abrir e exportar continua sendo
uma ação manual dentro do app, a menos que a gente simule os cliques que um
humano faria. É isso que `calibrate_windows.py` e `automate_windows.py` fazem.

Essa camada só existe no Windows porque a exportação automatizada do CapCut
(mesmo em ferramentas de terceiros como `pyCapCut`) é documentada como
suportada apenas ali — no Mac o app existe, mas essa automação de clique não
foi validada e o comportamento não é garantido.

## Como funciona a calibração

`calibrate_windows.py` pede para o usuário posicionar o mouse manualmente
sobre 4 pontos da interface do CapCut (abrir o projeto mais recente, botão
Exportar, botão de confirmar exportação, botão de fechar ao concluir) e grava
a posição do cursor em pixels absolutos de tela num arquivo JSON.

`automate_windows.py` lê esse JSON e reproduz os cliques na mesma ordem, com
esperas fixas entre eles.

## Por que isso quebra fácil

Coordenadas de tela são absolutas — qualquer uma dessas mudanças invalida a
calibração:

- Resolução de tela ou escala de DPI diferente.
- Janela do CapCut em posição/tamanho diferente do que estava na calibração
  (não maximizada, movida para outro monitor, etc.).
- Atualização do CapCut que reorganiza a interface.
- Mais de um projeto sendo criado entre a geração do draft e a automação —
  o script assume que o projeto recém-gerado é o primeiro da lista (mais
  recente), o que só é verdade se nada mais mexeu na lista de projetos nesse
  meio-tempo.
- O timing de exportação (`--export-wait`) é uma estimativa fixa, não uma
  detecção real de "terminou" — vídeos mais longos que o esperado fazem o
  script clicar em "fechar" antes da exportação acabar.

Nenhum desses casos gera um erro visível — o script clica no lugar errado
silenciosamente. Por isso a skill instrui a sempre conferir o arquivo
exportado depois, e a rodar com `--dry-run` primeiro quando não se tem certeza
do estado da tela.

## Troubleshooting

- **Nada acontece / clica no lugar errado**: recalibre com
  `calibrate_windows.py`. Confirme que a janela do CapCut está exatamente no
  mesmo estado (maximizada, mesmo monitor) que estava durante a calibração
  anterior.
- **A exportação não termina a tempo**: aumente `--export-wait` para um valor
  maior que a duração real de exportação dos seus vídeos (teste manualmente
  uma vez cronometrando).
- **O projeto errado é aberto**: confirme que nenhum outro draft foi criado ou
  modificado entre rodar `generate_draft.py` e `automate_windows.py` — a
  premissa de "primeiro da lista = mais recente" depende disso.
- **Multi-monitor**: calibre com o CapCut sempre no mesmo monitor/posição; o
  script não sabe em qual monitor a janela está, só usa coordenadas absolutas.

## Alternativa mais robusta (não implementada aqui)

`pywinauto` consegue inspecionar a árvore de acessibilidade (UI Automation)
do Windows em vez de depender só de coordenadas de pixel — se os elementos do
CapCut expuserem nomes/IDs estáveis, dá para clicar "no botão Exportar" por
identificação em vez de por posição, o que resiste a mudanças de resolução e
layout. Isso não foi implementado aqui porque não há como validar contra o
CapCut de verdade neste ambiente (sem Windows, sem display, sem o app
instalado) — antes de investir nisso, vale inspecionar a árvore de
acessibilidade do CapCut com uma ferramenta como o Accessibility Insights for
Windows para confirmar se os elementos relevantes são identificáveis dessa
forma.

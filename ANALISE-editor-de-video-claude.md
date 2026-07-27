# Análise de confiabilidade — `bernardreacher/editor-de-video-claude`

**Repositório analisado:** https://github.com/bernardreacher/editor-de-video-claude
**Data da análise:** 2026-07-27
**Commit inspecionado:** `bernardreacher` — "Adiciona a skill do gerente de operacao" (2026-07-27)

---

## Veredito rápido

**É confiável do ponto de vista de segurança. Pode instalar.**

Inspecionei **todos** os arquivos do repositório (não é grande — ~760 linhas de código sem
contar o `package-lock.json`). Não encontrei nada malicioso: nenhuma exfiltração de dados, nenhum
comando destrutivo, nenhum acesso a credenciais, nenhuma chamada de rede escondida, nenhum código
ofuscado e nenhuma injeção de prompt nas skills.

O que o repositório é, de fato: uma skill de edição de vídeo (corte + legenda) genuína e bem
escrita, mais um pequeno projeto [Remotion](https://remotion.dev) para queimar a legenda na tela.
É basicamente o template oficial `CaptionedVideo` do Remotion, adaptado.

Há **3 pontos de atenção** (abaixo) — nenhum é falha de segurança, mas você deve conhecê-los
antes de usar.

---

## O que tem no repositório

| Arquivo | O que é | Risco |
|---|---|---|
| `skills/editor-de-video/SKILL.md` | Guia (texto puro) de como cortar e legendar vídeo | Nenhum |
| `skills/gerente-de-operacao/SKILL.md` | Guia (texto puro) de orquestração de agentes | Ver ponto de atenção nº 2 |
| `legendador/convert.mjs` | Converte o SRT do whisper em JSON pro Remotion | Nenhum |
| `legendador/src/**/*.tsx` | Componentes Remotion que renderizam a legenda | Nenhum |
| `legendador/package.json` + `package-lock.json` | Dependências (Remotion, React, zod) | Nenhum |
| `README.md`, `.gitignore`, `tsconfig.json` | Config e documentação | Nenhum |

As duas skills são **markdown puro** — não executam nada por si só. Elas são *instruções* que o
Claude lê e segue. O código executável de verdade é só o `convert.mjs` e o projeto Remotion.

---

## Análise de segurança (item por item)

O que verifiquei e o resultado:

- **Injeção de prompt nas skills** → **Nada.** As duas `SKILL.md` são conselhos legítimos de
  edição/operação. Não tentam redirecionar o Claude pra fazer algo fora do escopo, não pedem
  credenciais, não mandam contatar servidor nenhum.
- **Exfiltração de dados / chamadas de rede** → **Nada.** Os únicos `fetch()` do projeto
  (`index.tsx`) carregam **arquivos locais** (o JSON da legenda, derivado do nome do vídeo, e um
  `broll.json` opcional protegido por checagem de existência). São o jeito padrão do Remotion de
  ler assets locais durante o render — não vão pra internet.
- **Comandos destrutivos** (`rm -rf`, `unlink`, sobrescrever fora do escopo) → **Nada.** O único
  `writeFileSync` do repo grava em `public/<nome>.json`, dentro da própria pasta do projeto.
- **Acesso a segredos** (`process.env` com tokens, `~/.ssh`, `~/.aws`, senhas) → **Nada.** O único
  uso de `process.argv` é ler o nome do clipe passado na linha de comando.
- **Supply-chain / dependências** → **Limpo.** Todas as URLs `resolved` do `package-lock.json`
  apontam para `registry.npmjs.org` (nenhum registro estranho). As dependências são pacotes
  conhecidos e mantidos: Remotion, React 19, zod. **Não há** scripts de ciclo de vida
  (`preinstall`/`postinstall`/`install`) — ou seja, `npm install` não roda código arbitrário
  escondido.
- **Ofuscação / código codificado** (`eval`, `base64 -d`, `child_process`, `/dev/tcp`) → **Nada.**

---

## Pontos de atenção (não são falhas — mas você deve saber)

**1. A skill faz o Claude rodar comandos no seu computador.**
É a natureza de uma skill de edição de vídeo: ela instrui o Claude a executar `ffmpeg`,
`auto-editor`, `whisper-cli` e `npx remotion render` na sua máquina. Todos os comandos mostrados
são legítimos e padrão da área, mas entenda que instalar essa skill = o Claude vai propor rodar
shell. No Claude Code você aprova cada comando; mantenha essa aprovação ligada.

**2. A skill `gerente-de-operacao` orienta o agente a "consertar a instrução de outro agente".**
No Passo 5 ela diz: quando um agente errar, edite o *prompt* dele, não a saída. É um padrão de
meta-automação legítimo (melhorar prompts com o tempo), **não** é malicioso. Mas significa que,
usando essa skill, o Claude pode propor **editar arquivos de skill/instrução**. Isso também passa
pela sua aprovação — só fique ciente do comportamento.

**3. Procedência.** É o repositório pessoal de um indivíduo (`bernardreacher`), MIT, pequeno e
recém-publicado — sem histórico de comunidade que dê pra verificar de forma independente. O código
é seguro (li tudo), mas "confiável" no sentido de reputação estabelecida ainda não se aplica. A
boa notícia: as `SKILL.md` são curtas e em português claro — dá pra você mesmo ler antes de
instalar (recomendo).

---

## Bugs / inconsistências menores (não afetam segurança)

- `package.json` define `"create-subtitles": "node sub.mjs"`, mas o arquivo real se chama
  `convert.mjs`. Rodar `npm run create-subtitles` falha. O README usa o comando certo
  (`node convert.mjs`), então na prática não atrapalha — é só um script morto no `package.json`.

---

## Recomendação

**Instalar é seguro.** É uma skill honesta, o código é limpo e as dependências são idôneas.

Antes de instalar, sugiro:

1. **Leia as duas `SKILL.md`** você mesmo (são ~110 linhas cada, em português) — assim você sabe
   exatamente que instruções está dando ao Claude.
2. Ao rodar, **mantenha a aprovação de comandos ligada** no Claude Code (padrão), já que a skill
   executa `ffmpeg`/`whisper`/`remotion` e pode propor editar arquivos de instrução.
3. Como sempre com skills de terceiros, prefira **fixar a versão** (o commit que você revisou) em
   vez de sempre puxar `main` cegamente — assim uma atualização futura do repo não entra sem você
   revisar de novo.

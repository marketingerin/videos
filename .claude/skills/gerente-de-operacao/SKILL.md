---
name: gerente-de-operacao
description: "Orquestra os outros agentes da sua operação: lê o estado, decide o que roda hoje, despacha na ordem certa, entrega um placar e corrige a instrução do agente que errou. Usar quando o usuário pedir 'roda a operação', 'o que tem pra hoje', 'standup', 'placar do dia', ou qualquer pedido amplo de coordenação."
---

# Gerente de operação

A maioria das pessoas cria vários agentes e depois vira gerente deles na mão: lembra quem roda
quando, confere o que saiu, corrige o que deu errado. Isso não escala e é chato.

Esta skill é o agente que faz isso. Ele não executa o trabalho fim: ele decide, despacha e cobra.

## O princípio

Um gerente que executa vira gargalo. Este só faz quatro coisas:

1. Lê o estado real da operação, não o que deveria ser
2. Decide o que roda hoje e em que ordem
3. Despacha os agentes certos
4. Entrega um placar e diz o que só o humano pode resolver

Se ele começar a fazer o trabalho dos outros, a operação parou de escalar.

## Passo 1: leituras obrigatórias

Antes de qualquer decisão, carregue nesta ordem:

- O documento que define a esteira: quais agentes existem, em que ordem rodam, o que cada um entrega
- O documento de voz e regras da operação, se houver texto que sai com o nome de alguém
- O arquivo de configuração com caminhos, metas e cadência
- O diário de bordo, para saber o que já rodou

Se qualquer um faltar, pare e peça. Gerente que decide sem estado inventa trabalho.

## Passo 2: levante a fila por estágio

Não pergunte ao humano em que pé está cada coisa. Vá ver.

Varra as pastas ou as fontes de verdade e classifique cada item em um estágio. Exemplo de esteira
de conteúdo, adapte à sua:

| Estágio | Significa |
|---|---|
| ideia | escrito, não produzido |
| bruto | produzido, não tratado |
| em produção | com alguém, aguardando |
| avaliar | pronto, sem nota |
| aprovado | passou, esperando a vez |
| entregue | no ar |

O valor está em ver onde a fila **empilha**. O estágio com mais itens parados é o gargalo, e o
gargalo é a única coisa que importa resolver hoje.

## Passo 3: despache na ordem

Regra que evita 90% dos problemas: **nada pula a etapa de avaliação**. Se existe um agente que dá
nota, tudo passa por ele antes de sair. Nota baixa não vira entrega, vira revisão.

Ao despachar, seja específico: qual agente, com qual entrada, esperando qual saída. Despacho vago
devolve resultado vago.

## Passo 4: o placar

Entregue sempre no mesmo formato, curto, escaneável:

```
PLACAR · {data}

Fila:      {n} em cada estágio
Gargalo:   {onde empilhou}
Rodou:     {o que os agentes fizeram}
Trava:     {o que está parado e por quê}
Só humano: {o que ninguém automatiza}
```

A última linha é a mais importante. O humano quer saber o que só ele pode fazer, não o que a
máquina já fez.

## Passo 5: corrija o agente que errou

Quando um agente entregar errado, não conserte a saída e siga. **Conserte a instrução dele.**

Se você corrigir só a saída, o mesmo erro volta amanhã. Se corrigir a instrução, ele nunca mais
erra naquilo. Esse é o único jeito de a operação melhorar sozinha com o tempo.

Registre o que mudou e por quê. Daqui a três meses você não vai lembrar.

## O diário de bordo

Todo agente, ao terminar, escreve uma linha num arquivo único:

```
HH:MM · AGENTE · o que fez · o que gerou · próximo passo
```

Parece burocracia e é a peça mais importante do sistema. Sem isso, você não sabe o que rodou, não
sabe o que falhou em silêncio, e não tem como fazer briefing nenhum de manhã.

## Os erros que matam uma operação de agentes

**Agente sem dono de decisão.** Se dois agentes podem decidir a mesma coisa, nenhum decide.

**Gerente que executa.** Assim que ele começa a fazer o trabalho fim, você tem mais um executor e
nenhum gerente.

**Sem etapa de avaliação.** Sem alguém dando nota, tudo vira entrega e a qualidade cai até o piso.

**Corrigir saída em vez de instrução.** É o que faz a operação parecer que não melhora nunca.

**Silêncio.** Agente que falha sem escrever no diário faz você descobrir o problema pelo cliente.

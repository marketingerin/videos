---
name: editor-de-video
description: "Transforma vídeo bruto em corte vertical legendado, pronto pra postar. Usar quando o usuário pedir pra editar vídeo, cortar bruto, legendar, montar reel, ou processar uma pasta de gravações."
---

# Editor de vídeo

Pega um bruto de celular ou câmera e devolve um vertical legendado de 50 a 90 segundos.
O trabalho é feito em três camadas: corte mecânico, corte semântico e legenda.

## Antes de cortar (ordem obrigatória)

1. **Assista antes.** Extraia frames e olhe de verdade. Transcrição sozinha esconde erro de fala,
   enquadramento ruim e queda de energia. Cortar só pela transcrição sempre entrega vídeo torto.
2. **Bruto longo (5 min ou mais) quase nunca é um vídeo só.** Transcreva, mapeie o conteúdo e
   decida: normalmente são dois vídeos colados, com ganchos e objetivos diferentes. Separe antes
   de cortar. Cada um vira um corte de 60 a 90 segundos, com o gancho nos 3 primeiros segundos, e
   costuma sair uns 75% de gordura.
3. **Nunca recorte um vídeo já renderizado.** O reencode estraga a legenda nas emendas.
   Sempre reconstrua a partir do bruto.

## Camada 1: corte mecânico

Normalize para vertical 1080x1920 a 30fps. Se houver várias partes, costure em ordem.
Depois corte o silêncio automaticamente.

Com auto-editor:

```bash
auto-editor ENTRADA.mp4 --edit audio:threshold=5% --margin 0.12s -b:v 12M -o SAIDA.mp4
```

A margem de 0.12s existe pra não comer o começo das palavras. Sem ela o corte fica picotado.

## Camada 2: corte semântico (o que a máquina não faz)

O auto-editor tira silêncio. Ele não tira frase ruim. Para isso, leia a transcrição
palavra a palavra e decida os cortes na mão:

- Tire o lead-in morto. Entre direto na fala que importa.
- Remova erros de fala e frases repetidas.
- Monte na ordem gancho, desenvolvimento, CTA.
- Nunca deixe frase órfã, aquela que depende de contexto que ficou de fora.

**Regra de ouro: sempre encoste a borda do corte numa pausa real de silêncio.**
Cortar no meio da fala contínua deixa fragmento de palavra. Localize as pausas assim:

```bash
ffmpeg -i ENTRADA.mp4 -af silencedetect=noise=-32dB:d=0.15 -f null - 2>&1 | grep silence
```

Só corte onde existe pausa.

## Vícios de linguagem

Dá pra remover automaticamente "é" isolado de hesitação, e tiques como "tipo", "assim",
"né", "enfim". Mas só remova o tique **quando existir uma pausa de pelo menos 120ms antes dele**.
Sem pausa, o corte come a palavra vizinha e o áudio fica com clique.

Quando os tiques estão colados na fala, sem pausa nenhuma, automação não resolve. As saídas
honestas são cortar blocos inteiros nas pausas de fim de frase, fazer um trim manual, ou
regravar com pausas. Não entregue como se estivesse limpo sabendo que não está.

## Camada 3: legenda

Transcreva com timestamps por palavra. O whisper resolve bem:

```bash
ffmpeg -i ENTRADA.mp4 -ar 16000 -ac 1 audio.wav
whisper-cli -m ggml-small.bin -l pt -ml 1 -sow -f audio.wav
```

Use o modelo small ou maior para português. O base erra palavra estrangeira.
Monte um dicionário de correção para os termos do seu nicho, porque o whisper sempre erra
os mesmos, e corrigir na mão toda vez é desperdício.

Estilo que funciona: branco puro, fonte pesada, por volta de 56px, centralizado, contorno fino,
uma a três palavras por vez, caixa natural. Sem destaque colorido.

## O que faz parecer edição cara

Três coisas, todas automatizáveis:

**Tamanho variado.** Palavra com número, ou palavra do vocabulário da sua marca, sai maior e mais
pesada que o resto. É o detalhe que mais muda a percepção de qualidade.

**Zoom-punch.** Um soco de zoom de uns 8%, durando 11 frames, com curva suave, toda vez que
aparece um número na legenda. A tela empurra no dado.

**Imagem de apoio no canto.** Leia a transcrição, procure os termos que rendem imagem
(países, marcas, conceitos), e coloque um card arredondado no canto durante a palavra falada.
Duas travas obrigatórias: nada de card durante o gancho, e um intervalo mínimo entre cards
pra não empilhar.

## Correção de cor

Não aplique por padrão. A tendência de todo grade automático é clarear pele e mudar o tom real
da pessoa. Só aplique se pedirem, e aprove olhando frame antes de renderizar.

## Verificação

Sempre extraia frames do resultado e olhe. Repita até estar limpo. Rodar a pipeline e entregar
sem olhar é como fazer commit sem rodar o teste.

## A regra que economiza mais tempo

Grave com pausa clara entre as tentativas. Take limpo faz a pipeline acertar sozinha.
Take gaguejado exige corte manual e nenhuma automação salva.

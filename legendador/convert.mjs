// Converte o SRT palavra a palavra do whisper no JSON que o Remotion lê.
//
// Uso:  node convert.mjs [nome-do-clipe]
//   sem argumento, assume public/clip.mp4 e escreve public/clip.json
//
// O componente procura o JSON com o MESMO nome do vídeo, então clip.mp4
// precisa de clip.json ao lado.

import { parseSrt } from "@remotion/captions";
import { readFileSync, writeFileSync } from "node:fs";

// O whisper sempre erra as mesmas palavras do seu nicho. Em vez de corrigir
// na mão toda vez, coloque o padrão aqui uma vez e nunca mais pense nisso.
const CORRECOES = [
  // [/^comoowhispererrou$/i, "como deveria ficar"],
];

const nome = (process.argv[2] || "clip").replace(/\.(mp4|mov|mkv|webm)$/i, "");

const { captions } = parseSrt({
  input: readFileSync("clip_words.srt", "utf8"),
});

const limpo = captions
  .filter((c) => c.text && c.text.trim().length)
  .map((c) => {
    let t = c.text.trim();
    for (const [re, rep] of CORRECOES) {
      if (re.test(t)) t = t.replace(re, rep);
    }
    return { ...c, text: t };
  })
  .map((c, i) => ({ ...c, text: (i === 0 ? "" : " ") + c.text }));

writeFileSync(`public/${nome}.json`, JSON.stringify(limpo));
console.log(`public/${nome}.json escrito, ${limpo.length} palavras`);

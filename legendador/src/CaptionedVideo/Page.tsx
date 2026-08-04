import { TikTokPage } from "@remotion/captions";
import React from "react";
import { AbsoluteFill } from "remotion";

// sincronizado com SPLIT_SECONDS do index.tsx (6s)
const SPLIT_MS = 6000;

// Ênfase por TAMANHO (ref: reels bem editados — keyword gigante, conector pequeno).
// Palavra com dígito OU do vocabulário da marca ganha fonte maior.
// Palavras que saem MAIORES na legenda. Toda palavra com dígito já entra
// automaticamente. Troque a lista abaixo pelo vocabulário do SEU nicho:
// é o detalhe que mais faz a edição parecer cara.
const EMPHASIS_WORDS = new Set([
  "milhoes", "milhao", "gratis",
  "seis", "tres", "cem", "mil", // números por extenso que o whisper escreve
]);
const norm = (s: string) =>
  s.trim().toLowerCase().replace(/[,.!?…]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const isEmphasis = (text: string) => /\d/.test(text) || EMPHASIS_WORDS.has(norm(text));

export const Page: React.FC<{ readonly enterProgress: number; readonly page: TikTokPage; readonly splitActive?: boolean }> = ({ page, splitActive }) => {
  // Só sobe a legenda pro meio quando o split-screen (foto) está REALMENTE ativo.
  // Sem split, a legenda fica sempre no pescoço (senão fica no meio da cara no hook).
  const duringSplit = Boolean(splitActive) && page.startMs < SPLIT_MS;
  const container: React.CSSProperties = {
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0 100px",
    paddingBottom: duringSplit ? 980 : 380, // meio da tela no split, pescoço depois
  };
  return (
    <AbsoluteFill style={container}>
      <div style={{ fontSize: 56, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, color: "white", WebkitTextStroke: "1.5px rgba(0,0,0,0.5)", paintOrder: "stroke", textShadow: "0 3px 14px rgba(0,0,0,0.5)", textAlign: "center", lineHeight: 1.15, maxWidth: "100%", wordBreak: "break-word", letterSpacing: "-0.5px" }}>
        {page.tokens.map((t) =>
          isEmphasis(t.text) ? (
            <span key={t.fromMs} style={{ color: "white", fontSize: 76, fontWeight: 800 }}>{t.text}</span>
          ) : (
            <span key={t.fromMs} style={{ color: "white" }}>{t.text}</span>
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

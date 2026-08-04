import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { getVideoMetadata } from "@remotion/media-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  cancelRender,
  getStaticFiles,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
  watchStaticFile,
} from "remotion";
import { z } from "zod";
import { loadFont } from "../load-font";
import { NoCaptionFile } from "./NoCaptionFile";
import SubtitlePage from "./SubtitlePage";

export const captionedVideoSchema = z.object({
  src: z.string(),
});

export const calculateCaptionedVideoMetadata: CalculateMetadataFunction<
  z.infer<typeof captionedVideoSchema>
> = async ({ props }) => {
  const fps = 30;
  const metadata = await getVideoMetadata(props.src);
  return { fps, durationInFrames: Math.floor(metadata.durationInSeconds * fps) };
};

const getFileExists = (file: string) => {
  return getStaticFiles().some((f) => f.src === file);
};

const SWITCH_CAPTIONS_EVERY_MS = 650;
// Split-screen do Haaland (foto em cima / vídeo embaixo) durante o hook.
// Só ativa se public/split-image.jpg existir. 0 = desliga.
const SPLIT_SECONDS = 6;

// Zoom-punch: um "soco" de zoom sutil em cima dos NÚMEROS/stats (a tela
// dá um empurrão quando ele fala um dado concreto — sobe retenção).
// Dispara em qualquer legenda que contenha dígito. 0 de amplitude = desliga.
const PUNCH_DURATION_FRAMES = 11;
const PUNCH_AMPLITUDE = 0.08;

type BrollCard = { src: string; startMs: number; endMs: number };

export const CaptionedVideo: React.FC<{ src: string }> = ({ src }) => {
  const [subtitles, setSubtitles] = useState<Caption[]>([]);
  const [broll, setBroll] = useState<BrollCard[]>([]);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const subtitlesFile = src
    .replace(/.mp4$/, ".json")
    .replace(/.mkv$/, ".json")
    .replace(/.mov$/, ".json")
    .replace(/.webm$/, ".json");

  const fetchSubtitles = useCallback(async () => {
    try {
      await loadFont();
      const res = await fetch(subtitlesFile);
      const data = (await res.json()) as Caption[];
      setSubtitles(data);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, handle, subtitlesFile]);

  useEffect(() => {
    fetchSubtitles();
    const c = watchStaticFile(subtitlesFile, () => fetchSubtitles());
    return () => c.cancel();
  }, [fetchSubtitles, src, subtitlesFile]);

  // B-roll automático: cards de imagem (broll.json) que entram no canto quando
  // um termo é falado (China, Amazon, país…). Opcional — se o arquivo não
  // existir, não renderiza nada.
  useEffect(() => {
    const brollFile = staticFile("broll.json");
    if (!getFileExists(brollFile)) return;
    fetch(brollFile)
      .then((r) => r.json())
      .then((d) => setBroll(d as BrollCard[]))
      .catch(() => {});
  }, []);

  const { pages } = useMemo(() => {
    return createTikTokStyleCaptions({
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
      captions: subtitles ?? [],
    });
  }, [subtitles]);

  const splitImageExists = getFileExists(staticFile("split-image.jpg"));
  const inSplit = splitImageExists && SPLIT_SECONDS > 0 && frame < SPLIT_SECONDS * fps;

  // Frames onde entra um número → soco de zoom.
  const punchFrames = useMemo(
    () =>
      (subtitles ?? [])
        .filter((c) => /\d/.test(c.text))
        .map((c) => Math.round((c.startMs / 1000) * fps)),
    [subtitles, fps],
  );

  let punchScale = 1;
  for (const pf of punchFrames) {
    if (frame >= pf && frame < pf + PUNCH_DURATION_FRAMES) {
      const t = (frame - pf) / PUNCH_DURATION_FRAMES;
      punchScale = 1 + PUNCH_AMPLITUDE * Math.sin(t * Math.PI);
      break;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {inSplit ? (
        <Img
          src={staticFile("split-image.jpg")}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "38%", objectFit: "cover", objectPosition: "center" }}
        />
      ) : null}
      <AbsoluteFill style={inSplit ? { top: "38%", height: "62%", overflow: "hidden" } : { overflow: "hidden" }}>
        <OffthreadVideo style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: `scale(${punchScale})` }} src={src} />
      </AbsoluteFill>
      {broll.map((b, i) => {
        const startF = (b.startMs / 1000) * fps;
        const endF = (b.endMs / 1000) * fps;
        if (frame < startF || frame >= endF) return null;
        // pop-in nos primeiros ~6 frames, e fade-out nos últimos ~6
        const intro = Math.min(1, (frame - startF) / 6);
        const outro = Math.min(1, (endF - frame) / 6);
        const appear = Math.min(intro, outro);
        const scale = 0.86 + 0.14 * intro;
        return (
          <Img
            key={`broll-${i}`}
            src={staticFile(b.src)}
            style={{
              position: "absolute",
              top: "6%",
              right: "5%",
              width: "34%",
              borderRadius: 22,
              border: "4px solid white",
              boxShadow: "0 10px 34px rgba(0,0,0,0.55)",
              objectFit: "cover",
              transform: `scale(${scale})`,
              opacity: appear,
            }}
          />
        );
      })}
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const subtitleStartFrame = (page.startMs / 1000) * fps;
        const subtitleEndFrame = Math.min(
          nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
          subtitleStartFrame + SWITCH_CAPTIONS_EVERY_MS,
        );
        const durationInFrames = subtitleEndFrame - subtitleStartFrame;
        if (durationInFrames <= 0) return null;
        return (
          <Sequence key={index} from={subtitleStartFrame} durationInFrames={durationInFrames}>
            <SubtitlePage key={index} page={page} splitActive={splitImageExists} />
          </Sequence>
        );
      })}
      {getFileExists(subtitlesFile) ? null : <NoCaptionFile />}
    </AbsoluteFill>
  );
};

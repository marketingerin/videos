import { continueRender, delayRender, staticFile } from "remotion";

// Fonte da legenda.
//
// Se você colocar um arquivo .ttf em public/legenda.ttf, ele é usado.
// Se não colocar, cai no fallback do sistema e o render continua funcionando.
// Não deixamos nenhuma fonte no repositório porque fonte tem licença própria:
// escolha a sua e coloque ali.

export const TheBoldFont = `LegendaFont`;

let loaded = false;

export const loadFont = async (): Promise<void> => {
  if (loaded) {
    return Promise.resolve();
  }

  loaded = true;
  const waitForFont = delayRender();

  try {
    const font = new FontFace(
      TheBoldFont,
      `url('${staticFile("legenda.ttf")}') format('truetype')`,
    );
    await font.load();
    document.fonts.add(font);
  } catch {
    // sem fonte própria: o CSS cai no fallback declarado no Page.tsx
  }

  continueRender(waitForFont);
};

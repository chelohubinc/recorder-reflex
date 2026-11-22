import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecorderDiagram } from "./RecorderDiagram";
import { NOTES } from "@/features/music/data/notes";
import { halfHolesFor } from "@/features/music/types/fingering";

describe("RecorderDiagram", () => {
  it("renders the thumb as a separate rear-face control and seven numbered front holes", () => {
    const markup = renderToStaticMarkup(createElement(RecorderDiagram, {
      value: NOTES[0].fingering,
      onChange: () => undefined,
      interactive: false,
    }));
    expect(markup).toContain("FACE ARRIÈRE · POUCE");
    expect(markup).toContain("FACE AVANT");
    expect(markup.match(/aria-label="Trou frontal [1-7],/g)).toHaveLength(7);
    expect(markup).toContain("Trou arrière du pouce");
  });

  it.each(NOTES)("renders $id using its reference hole states", (note) => {
    const markup = renderToStaticMarkup(createElement(RecorderDiagram, {
      value: note.fingering,
      onChange: () => undefined,
      interactive: false,
      halfAllowed: halfHolesFor(note.fingering),
    }));
    const buttonMarkup = [...markup.matchAll(/<button\b[^>]*class="([^"]*recorder-hole[^"]*)"[^>]*>/g)].map((match) => match[1]);
    expect(buttonMarkup).toHaveLength(8);
    expect(buttonMarkup[0]).toContain(note.fingering.thumb);
    note.fingering.front.forEach((state, index) => expect(buttonMarkup[index + 1]).toContain(state));
  });
});

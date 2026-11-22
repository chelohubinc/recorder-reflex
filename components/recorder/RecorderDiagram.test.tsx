import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecorderDiagram } from "./RecorderDiagram";
import { NOTES } from "@/features/music/data/notes";
import { halfHolesFor } from "@/features/music/types/fingering";

describe("RecorderDiagram", () => {
  it("separates the rear thumb from the seven front holes", () => {
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

  it.each(NOTES)("renders all eight reference states for $id", (note) => {
    const markup = renderToStaticMarkup(createElement(RecorderDiagram, {
      value: note.fingering,
      onChange: () => undefined,
      interactive: false,
      halfAllowed: halfHolesFor(note.fingering),
    }));

    const buttons = [...markup.matchAll(/<button\b[^>]*class="([^"]*recorder-hole[^"]*)"[^>]*>/g)];
    expect(buttons).toHaveLength(8);
    expect(buttons[0][1]).toContain(note.fingering.thumb);
    note.fingering.front.forEach((state, index) => {
      expect(buttons[index + 1][1]).toContain(state);
    });
  });
});

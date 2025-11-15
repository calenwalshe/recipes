import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { applyBreakpointClasses, getBreakpoint } from "../layout.js";

const html = fs.readFileSync(path.resolve("web/index.html"), "utf8");

describe("layout breakpoints", () => {
  let dom;

  beforeEach(() => {
    dom = new JSDOM(html);
  });

  it("identifies the expected breakpoints", () => {
    expect(getBreakpoint(420)).toBe("mobile");
    expect(getBreakpoint(720)).toBe("tablet");
    expect(getBreakpoint(1024)).toBe("desktop");
  });

  it("applies mobile-first classes at narrow widths", () => {
    const breakpoint = applyBreakpointClasses(dom.window.document, 420);
    expect(breakpoint).toBe("mobile");
    expect(dom.window.document.documentElement.dataset.breakpoint).toBe("mobile");
    expect(dom.window.document.documentElement.classList.contains("viewport-mobile")).toBe(true);

    expect({
      breakpoint,
      dataset: { ...dom.window.document.documentElement.dataset },
      classes: Array.from(dom.window.document.documentElement.classList).sort(),
    }).toMatchInlineSnapshot(`
      {
        "breakpoint": "mobile",
        "classes": [
          "viewport-mobile",
        ],
        "dataset": {
          "breakpoint": "mobile",
        },
      }
    `);
  });

  it("updates classes as viewports grow", () => {
    applyBreakpointClasses(dom.window.document, 720);
    expect(dom.window.document.documentElement.dataset.breakpoint).toBe("tablet");
    expect(dom.window.document.documentElement.classList.contains("viewport-tablet")).toBe(true);

    applyBreakpointClasses(dom.window.document, 980);
    expect(dom.window.document.documentElement.dataset.breakpoint).toBe("desktop");
    expect(dom.window.document.documentElement.classList.contains("viewport-desktop")).toBe(true);
  });
});

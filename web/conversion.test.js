import assert from "node:assert/strict";
import { test } from "node:test";
import { formatQuantity, normalizeToGrams, scaleQuantity } from "./conversion.js";

test("converts volume ingredients to grams using density", () => {
  const grams = normalizeToGrams(1, "cup", 0.8);
  assert.equal(grams, 192);
});

test("formats quantities with threshold rule favoring volume at <=10g", () => {
  const vanilla = { name: "Vanilla", quantity: 1, unit: "tsp", density: 1 };
  const formatted = formatQuantity(vanilla, 1, 10);
  assert.equal(formatted.scaledDisplay, "1 tsp (5 g)");
  assert.equal(formatted.normalizedDisplay, "5 g");
});

test("scales masses accurately with multipliers", () => {
  const flour = { name: "Flour", quantity: 100, unit: "g" };
  const scaled = formatQuantity(flour, 1.5);
  assert.equal(scaleQuantity(flour.quantity, 1.5), 150);
  assert.equal(scaled.scaledDisplay, "150 g");
});

test("falls back to volume messaging when density is missing", () => {
  const zest = { name: "Lemon zest", quantity: 2, unit: "tbsp" };
  const formatted = formatQuantity(zest, 1);
  assert.equal(formatted.missingDensity, true);
  assert.match(formatted.normalizedDisplay, /density needed/);
  assert.match(formatted.scaledDisplay, /density needed/);
});

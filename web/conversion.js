const MASS_UNITS = {
  g: 1,
  kg: 1000,
  mg: 0.001,
};

const VOLUME_TO_ML = {
  ml: 1,
  l: 1000,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const isMassUnit = (unit = "") => Object.hasOwn(MASS_UNITS, unit);
const isVolumeUnit = (unit = "") => Object.hasOwn(VOLUME_TO_ML, unit);

const toFixed = (value, digits = 1) => Number.parseFloat(value.toFixed(digits));

export const scaleQuantity = (quantity, multiplier = 1) => quantity * multiplier;

export const normalizeToGrams = (quantity, unit, density) => {
  if (Number.isNaN(quantity) || typeof quantity !== "number") return null;

  if (isMassUnit(unit)) {
    return quantity * MASS_UNITS[unit];
  }

  if (!isVolumeUnit(unit)) return null;
  if (typeof density !== "number") return null;

  const milliliters = quantity * VOLUME_TO_ML[unit];
  return milliliters * density;
};

export const formatQuantity = (ingredient, multiplier = 1, thresholdGrams = 10) => {
  const { quantity, unit, density } = ingredient;
  const normalizedGrams = normalizeToGrams(quantity, unit, density);
  const scaledQuantity = scaleQuantity(quantity, multiplier);
  const scaledGrams = normalizeToGrams(scaledQuantity, unit, density);

  const preferVolumeDisplay =
    isVolumeUnit(unit) && scaledGrams !== null && scaledGrams <= thresholdGrams;

  const baseDisplay = `${toFixed(quantity, 2)} ${unit}`.replace(/\.00\b/, "");
  const normalizedDisplay =
    normalizedGrams !== null ? `${toFixed(normalizedGrams)} g` : `${baseDisplay} (density needed for grams)`;

  let scaledDisplay;
  if (scaledGrams === null) {
    scaledDisplay = `${toFixed(scaledQuantity, 2)} ${unit} (density needed for grams)`;
  } else if (preferVolumeDisplay) {
    scaledDisplay = `${toFixed(scaledQuantity, 2)} ${unit} (${toFixed(scaledGrams)} g)`;
  } else {
    scaledDisplay = `${toFixed(scaledGrams)} g`;
  }

  return {
    baseDisplay,
    normalizedGrams,
    normalizedDisplay,
    scaledGrams,
    scaledDisplay,
    missingDensity: normalizedGrams === null && isVolumeUnit(unit),
  };
};

export const formatIngredientList = (ingredients = [], multiplier = 1, thresholdGrams = 10) =>
  ingredients.map((ingredient) => ({
    name: ingredient.name,
    detail: formatQuantity(ingredient, multiplier, thresholdGrams),
  }));

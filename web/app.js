import { applyBreakpointClasses } from "./layout.js";

const resultsEl = document.querySelector("#results");
const searchInput = document.querySelector("#search");
const template = document.querySelector("#recipe-card");
const statusMessage = document.createElement("p");
statusMessage.className = "microcopy";
statusMessage.style.marginBottom = "1rem";

applyBreakpointClasses(document, window.innerWidth);
window.addEventListener("resize", () => applyBreakpointClasses(document, window.innerWidth));

document.querySelector(".search-panel").append(statusMessage);

const detailTitle = document.querySelector("#detail-title");
const detailServings = document.querySelector("#detail-servings");
const ingredientListEl = document.querySelector("#ingredient-list");
const densityWarning = document.querySelector("#density-warning");
const servingMultiplierInput = document.querySelector("#serving-multiplier");

let selectedRecipe = null;
let servingsMultiplier = 1;

let recipes = [];
const cardRegistry = new Map();

const STORAGE_PREFIX = "recipe-meta:";
const DEFAULT_META = {
  note: "",
  made: false,
  rating: "",
  dateMade: "",
  image: "",
};

const inMemoryStore = new Map();
const storageBackend = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn("localStorage unavailable, using in-memory store", error);
      return inMemoryStore.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn("localStorage unavailable, using in-memory store", error);
      inMemoryStore.set(key, value);
    }
  },
};

const getStorageKey = (path) => `${STORAGE_PREFIX}${path}`;

export const loadRecipeMeta = (path) => {
  const raw = storageBackend.getItem(getStorageKey(path));
  if (!raw) return { ...DEFAULT_META };
  try {
    return { ...DEFAULT_META, ...JSON.parse(raw) };
  } catch (error) {
    console.warn("Unable to parse stored metadata, resetting", error);
    return { ...DEFAULT_META };
  }
};

export const saveRecipeMeta = (path, payload) => {
  const merged = { ...DEFAULT_META, ...payload };
  storageBackend.setItem(getStorageKey(path), JSON.stringify(merged));
  return merged;
};

const normalize = (value = "") => value.toLowerCase();

const tokensFrom = (value) =>
  normalize(value)
    .split(/\s+/)
    .filter(Boolean);

const renderBadges = (card, meta) => {
  const badges = card.querySelector(".card__badges");
  badges.innerHTML = "";

  if (meta.made) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Made it";
    badges.appendChild(badge);
  }

  if (meta.rating) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `Rating: ${meta.rating}`;
    badges.appendChild(badge);
  }

  if (!meta.rating && meta.dateMade) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `Made on ${meta.dateMade}`;
    badges.appendChild(badge);
  }

  if (meta.image) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "Photo added";
    badges.appendChild(badge);
  }
};

const updateBadgesForPath = (path, meta = null) => {
  const card = cardRegistry.get(path);
  if (!card) return;
  const data = meta ?? loadRecipeMeta(path);
  renderBadges(card, data);
};

const createDetailModal = () => {
  const dialog = document.createElement("dialog");
  dialog.className = "detail-modal";
  dialog.innerHTML = `
    <form method="dialog" class="detail-modal__body">
      <header class="detail-modal__header">
        <div>
          <p class="microcopy">Recipe details</p>
          <h3 class="modal__title"></h3>
        </div>
        <button type="submit" class="modal__close" aria-label="Close">×</button>
      </header>
      <label class="field">
        <span>Notes</span>
        <textarea class="modal__notes" rows="4" placeholder="What changed, tips, or ideas"></textarea>
      </label>
      <div class="modal__row">
        <label class="field">
          <span>Rating (1-5)</span>
          <input class="modal__rating" type="number" min="1" max="5" />
        </label>
        <label class="field">
          <span>Date made</span>
          <input class="modal__date" type="date" />
        </label>
      </div>
      <label class="field">
        <span>Image URL</span>
        <input class="modal__image" type="url" placeholder="https://example.com/photo.jpg" />
      </label>
      <label class="checkbox">
        <input class="modal__made" type="checkbox" />
        <span>I made this recipe</span>
      </label>
    </form>
  `;

  document.body.appendChild(dialog);

  const noteInput = dialog.querySelector(".modal__notes");
  const madeInput = dialog.querySelector(".modal__made");
  const ratingInput = dialog.querySelector(".modal__rating");
  const dateInput = dialog.querySelector(".modal__date");
  const imageInput = dialog.querySelector(".modal__image");
  const title = dialog.querySelector(".modal__title");

  const persist = () => {
    const path = dialog.dataset.path;
    if (!path) return;
    const saved = saveRecipeMeta(path, {
      note: noteInput.value,
      made: madeInput.checked,
      rating: ratingInput.value,
      dateMade: dateInput.value,
      image: imageInput.value,
    });
    updateBadgesForPath(path, saved);
  };

  noteInput.addEventListener("input", persist);
  madeInput.addEventListener("change", persist);
  ratingInput.addEventListener("input", persist);
  dateInput.addEventListener("input", persist);
  imageInput.addEventListener("input", persist);

  dialog.addEventListener("close", () => {
    dialog.dataset.path = "";
  });

  const open = (recipe) => {
    const existing = loadRecipeMeta(recipe.path);
    dialog.dataset.path = recipe.path;
    title.textContent = recipe.title;
    noteInput.value = existing.note;
    madeInput.checked = existing.made;
    ratingInput.value = existing.rating;
    dateInput.value = existing.dateMade;
    imageInput.value = existing.image;
    dialog.showModal();
  };

  return { dialog, open };
};

const detailModal = createDetailModal();

const updateStatus = (text, { busy = false } = {}) => {
  if (text) {
    statusMessage.textContent = text;
    statusMessage.hidden = false;
  } else {
    statusMessage.hidden = true;
  }
  resultsEl.setAttribute("aria-busy", busy ? "true" : "false");
};

export const buildCard = (recipe) => {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector(".card__eyebrow").textContent = recipe.category;
  node.querySelector("h2").textContent = recipe.title;
  node.querySelector(".card__summary").textContent = recipe.summary;
  node.dataset.path = recipe.path;

  const highlights = node.querySelector(".card__highlights");
  highlights.innerHTML = "";
  recipe.highlights.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    highlights.appendChild(li);
  });

  node.querySelector(".card__meta").textContent = recipe.tags.join(" · ");

  const badgesContainer = node.querySelector(".card__badges");
  if (!badgesContainer) {
    const fallbackBadges = document.createElement("div");
    fallbackBadges.className = "card__badges";
    node.appendChild(fallbackBadges);
  }

  const link = node.querySelector(".card__link");
  link.href = recipe.path;
  link.textContent = "Open recipe";

  const detailButton = node.querySelector(".card__details");
  if (detailButton) {
    detailButton.addEventListener("click", () => detailModal.open(recipe));
  }

  renderBadges(node, loadRecipeMeta(recipe.path));
  cardRegistry.set(recipe.path, node);

  return node;
};

const render = (list, query = "") => {
  resultsEl.innerHTML = "";
  cardRegistry.clear();
  if (!list.length) {
    const empty = document.createElement("article");
    empty.className = "card";
    empty.innerHTML = `<h2>No recipes match “${query}”</h2><p class="card__summary">Try fewer keywords or search for an ingredient like "lemon" or equipment like "tart pan".</p>`;
    resultsEl.appendChild(empty);
    return;
  }

  list.forEach((recipe) => {
    resultsEl.appendChild(buildCard(recipe));
  });
};

const recipeMatches = (recipe, queryTokens) =>
  queryTokens.every((token) => recipe.searchText.includes(token));

const resetDetail = () => {
  selectedRecipe = null;
  detailTitle.textContent = "Select a recipe to inspect ingredients";
  detailServings.textContent = "";
  renderIngredientList();
};

const renderIngredientList = () => {
  ingredientListEl.innerHTML = "";
  if (!selectedRecipe) {
    const placeholder = document.createElement("li");
    placeholder.className = "ingredient";
    placeholder.textContent = "Choose a recipe card to see ingredient conversions.";
    ingredientListEl.appendChild(placeholder);
    densityWarning.hidden = true;
    return;
  }

  const formatted = formatIngredientList(selectedRecipe.ingredients ?? [], servingsMultiplier);
  const missing = formatted.filter((item) => item.detail.missingDensity).map((item) => item.name);
  densityWarning.hidden = missing.length === 0;
  if (missing.length) {
    densityWarning.textContent = `Missing densities for: ${missing.join(", ")}. Using volume units until densities are provided.`;
  }

  formatted.forEach(({ name, detail }) => {
    const li = document.createElement("li");
    li.className = "ingredient";

    const top = document.createElement("div");
    top.className = "ingredient__top";
    const title = document.createElement("span");
    title.textContent = name;
    const base = document.createElement("span");
    base.className = "ingredient__meta";
    base.textContent = `Base: ${detail.baseDisplay}`;
    top.append(title, base);

    const normalized = document.createElement("p");
    normalized.className = "ingredient__conversion";
    normalized.textContent = `Normalized: ${detail.normalizedDisplay}`;

    const scaled = document.createElement("p");
    scaled.className = "ingredient__conversion";
    scaled.textContent = `Scaled (x${servingsMultiplier}): ${detail.scaledDisplay}`;

    li.append(top, normalized, scaled);

    if (detail.missingDensity) {
      const warning = document.createElement("p");
      warning.className = "ingredient__warning";
      warning.textContent = "Density missing; showing volume instead of grams.";
      li.appendChild(warning);
    }

    ingredientListEl.appendChild(li);
  });
};

const renderDetail = (recipe) => {
  selectedRecipe = recipe;
  detailTitle.textContent = recipe.title;
  detailServings.textContent = recipe.servings ? `Base servings: ${recipe.servings}` : "";
  renderIngredientList();
};

const handleSearch = (event) => {
  const query = event.target.value.trim();
  if (!query) {
    render(recipes);
    updateStatus(`Showing ${recipes.length} recipes`);
    if (recipes.length && !selectedRecipe) {
      renderDetail(recipes[0]);
    }
    return;
  }
  const queryTokens = tokensFrom(query);
  const filtered = recipes.filter((recipe) => recipeMatches(recipe, queryTokens));
  render(filtered, query);
  updateStatus(
    filtered.length
      ? `Showing ${filtered.length} recipe${filtered.length === 1 ? "" : "s"}`
      : `No matches for “${query}”`
  );
  if (!filtered.length) {
    resetDetail();
  } else if (!filtered.some((recipe) => recipe.id === selectedRecipe?.id)) {
    renderDetail(filtered[0]);
  }
};

const loadRecipes = async () => {
  updateStatus("Loading recipes…", { busy: true });
  try {
    const response = await fetch("./recipes-index.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const data = await response.json();
    recipes = data.map((recipe) => ({
      ...recipe,
      searchText: normalize(
        [recipe.title, recipe.summary, recipe.tags.join(" "), recipe.highlights.join(" ")].join(" ")
      ),
    }));
    render(recipes);
    updateStatus(`Showing ${recipes.length} recipes`);
    if (recipes.length) {
      renderDetail(recipes[0]);
    }
    searchInput.disabled = false;
    searchInput.focus();
  } catch (error) {
    console.error(error);
    updateStatus("Unable to load recipes. Double-check that recipes-index.json exists.");
    const fallback = document.createElement("article");
    fallback.className = "card";
    fallback.innerHTML = "<h2>Loading error</h2><p class=\"card__summary\">Refresh the page after fixing the data file.</p>";
    resultsEl.appendChild(fallback);
    searchInput.disabled = true;
  }
};

servingMultiplierInput.addEventListener("input", (event) => {
  const value = Number.parseFloat(event.target.value);
  if (!Number.isFinite(value) || value <= 0) {
    servingsMultiplier = 1;
    event.target.value = "1";
  } else {
    servingsMultiplier = value;
  }
  renderIngredientList();
});

searchInput.addEventListener("input", handleSearch);

renderIngredientList();

loadRecipes();

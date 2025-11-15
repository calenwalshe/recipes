const resultsEl = document.querySelector("#results");
const searchInput = document.querySelector("#search");
const template = document.querySelector("#recipe-card");
const statusMessage = document.createElement("p");
statusMessage.className = "microcopy";
statusMessage.style.marginBottom = "1rem";

document.querySelector(".search-panel").append(statusMessage);

let recipes = [];

const normalize = (value = "") => value.toLowerCase();

const tokensFrom = (value) =>
  normalize(value)
    .split(/\s+/)
    .filter(Boolean);

const updateStatus = (text, { busy = false } = {}) => {
  if (text) {
    statusMessage.textContent = text;
    statusMessage.hidden = false;
  } else {
    statusMessage.hidden = true;
  }
  resultsEl.setAttribute("aria-busy", busy ? "true" : "false");
};

const buildCard = (recipe) => {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector(".card__eyebrow").textContent = recipe.category;
  node.querySelector("h2").textContent = recipe.title;
  node.querySelector(".card__summary").textContent = recipe.summary;

  const highlights = node.querySelector(".card__highlights");
  highlights.innerHTML = "";
  recipe.highlights.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    highlights.appendChild(li);
  });

  node.querySelector(".card__meta").textContent = recipe.tags.join(" · ");

  const link = node.querySelector(".card__link");
  link.href = recipe.path;
  link.textContent = "Open recipe";

  return node;
};

const render = (list, query = "") => {
  resultsEl.innerHTML = "";
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

const handleSearch = (event) => {
  const query = event.target.value.trim();
  if (!query) {
    render(recipes);
    updateStatus(`Showing ${recipes.length} recipes`);
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

searchInput.addEventListener("input", handleSearch);

loadRecipes();

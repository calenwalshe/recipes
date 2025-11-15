import { describe, expect, test, vi, beforeEach } from "vitest";

const templateMarkup = `
  <template id="recipe-card">
    <article class="card">
      <p class="card__eyebrow"></p>
      <h2></h2>
      <p class="card__summary"></p>
      <ul class="card__highlights"></ul>
      <div class="card__badges" aria-live="polite"></div>
      <div class="card__meta"></div>
      <div class="card__actions">
        <button type="button" class="card__details">Details</button>
        <a class="card__link" target="_blank" rel="noopener"></a>
      </div>
    </article>
  </template>
`;

const mountDom = () => {
  document.body.innerHTML = `
    <section class="search-panel"></section>
    <input id="search" />
    <section id="results"></section>
    ${templateMarkup}
  `;

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
};

const mountModule = async () => {
  vi.resetModules();
  mountDom();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  return import("../app.js");
};

describe("recipe metadata persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test("saves and loads data keyed by recipe path", async () => {
    const { saveRecipeMeta, loadRecipeMeta } = await mountModule();
    const path = "/categories/desserts/lemon";
    saveRecipeMeta(path, { note: "zestier", made: true, rating: "5", image: "http://example.com" });

    expect(loadRecipeMeta(path)).toMatchObject({
      note: "zestier",
      made: true,
      rating: "5",
      image: "http://example.com",
    });
    expect(loadRecipeMeta("/other").note).toBe("");
  });

  test("renders badges from stored metadata during card build", async () => {
    const path = "/recipes/summer-pie";
    localStorage.setItem(
      `recipe-meta:${path}`,
      JSON.stringify({ note: "", made: true, rating: "4", dateMade: "", image: "photo.jpg" })
    );
    const { buildCard } = await mountModule();
    const card = buildCard({
      path,
      category: "Dessert",
      title: "Summer Pie",
      summary: "A bright and easy pie.",
      highlights: ["Citrus filling"],
      tags: ["pie", "citrus"],
    });

    const badgeTexts = [...card.querySelectorAll(".badge")].map((badge) => badge.textContent);
    expect(badgeTexts).toEqual(expect.arrayContaining(["Made it", "Rating: 4", "Photo added"]));
  });

  test("detail modal inputs persist immediately and update badges", async () => {
    const { buildCard } = await mountModule();
    const recipe = {
      path: "/recipes/waffles",
      category: "Breakfast",
      title: "Waffles",
      summary: "Crispy waffles",
      highlights: ["Crispy"],
      tags: ["waffle"],
    };
    const card = buildCard(recipe);
    document.querySelector("#results").appendChild(card);

    card.querySelector(".card__details").click();
    const dialog = document.querySelector("dialog");
    const noteInput = dialog.querySelector(".modal__notes");
    const madeInput = dialog.querySelector(".modal__made");

    noteInput.value = "Use less sugar";
    noteInput.dispatchEvent(new Event("input", { bubbles: true }));
    madeInput.checked = true;
    madeInput.dispatchEvent(new Event("change", { bubbles: true }));

    const stored = JSON.parse(localStorage.getItem(`recipe-meta:${recipe.path}`));
    expect(stored.note).toBe("Use less sugar");
    expect(stored.made).toBe(true);

    const badges = [...card.querySelectorAll(".badge")].map((badge) => badge.textContent);
    expect(badges).toContain("Made it");
  });
});

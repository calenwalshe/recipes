# recipes

This repository stores structured collections of recipes, organized by category.

## Categories

- [Desserts](categories/desserts/README.md) – Template-driven structure for storing sweet recipes, ingredient references, technique notes, and curated example recipes.

Add more categories by following the same directory pattern and adapting the templates as needed.

## Browse recipes in your browser

The `web/` directory contains a lightweight Recipe Explorer that lets you search every Markdown file referenced in
`web/recipes-index.json`.

### Local preview

1. Start a static server from the project root: `python3 -m http.server 4173 --directory web`.
2. Visit [http://localhost:4173](http://localhost:4173) to open the interface.
3. Add new recipes to `categories/desserts/recipes`, then register them inside `web/recipes-index.json` so the search picks them up.

### Publish to GitHub Pages

This site is fully static. A workflow in `.github/workflows/pages.yml` uploads the contents of `web/` to GitHub Pages when you push to `main` or run the workflow manually.

1. Enable GitHub Pages in the repository settings and select the `GitHub Actions` source.
2. Commit and push changes to `main` (including updates to `web/recipes-index.json` when you add recipes). The workflow builds the static site directly from the `web/` folder and deploys it to GitHub Pages.
3. Visit the published site using the URL provided in the workflow run summary.

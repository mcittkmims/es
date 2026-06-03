import { DATA_URL } from "./config.js";
import { els } from "./dom.js";
import { findVariant } from "./exam.js";
import { getSearchResults, renderSearchResult } from "./search.js";
import { renderVariant } from "./render.js";

let variants = [];

function renderSearch() {
  const query = els.searchInput.value.trim();

  if (!query) {
    els.searchMeta.textContent = "Search by question topic/name across every variant.";
    els.searchResults.innerHTML = "";
    return;
  }

  const matches = getSearchResults(variants, query);

  els.searchMeta.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} for “${query}”`;
  els.searchResults.innerHTML = matches.length
    ? matches.map(renderSearchResult).join("")
    : `<p class="empty">No matching questions found.</p>`;
}

function showVariant(number, highlightTaskKey = null) {
  renderVariant(els, findVariant(variants, number), highlightTaskKey);
}

function wireEvents() {
  els.variantSelect.addEventListener("change", (event) => {
    showVariant(event.target.value);
  });

  els.searchInput.addEventListener("input", renderSearch);

  els.clearSearch.addEventListener("click", () => {
    els.searchInput.value = "";
    renderSearch();
    els.searchInput.focus();
  });

  els.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest(".result-button");
    if (!button) return;

    showVariant(button.dataset.variant, button.dataset.task);
  });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    variants = await response.json();
    variants.sort((a, b) => a.variant - b.variant);

    els.variantSelect.innerHTML = variants
      .map((variant) => `<option value="${variant.variant}">Variant ${variant.variant}</option>`)
      .join("");

    showVariant(variants[0].variant);
    renderSearch();
    wireEvents();
  } catch (error) {
    els.variantTitle.textContent = "Exam browser";
    els.variantSubtitle.textContent = "The interface loaded, but the JSON file could not be read.";
    els.error.hidden = false;
    console.error(error);
  }
}

init();

import { DATA_URL } from "./config.js";
import { normalizeExamData } from "./data-normalizer.js";
import { els } from "./dom.js";
import { findVariant } from "./exam.js";
import { queueMathTypeset } from "./math.js";
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
  queueMathTypeset(els.tasks);
  const currentIndex = variants.findIndex((variant) => variant.variant === Number(els.variantSelect.value));
  els.prevVariant.disabled = currentIndex <= 0;
  els.nextVariant.disabled = currentIndex === -1 || currentIndex >= variants.length - 1;
}

function moveVariant(direction) {
  const currentIndex = variants.findIndex((variant) => variant.variant === Number(els.variantSelect.value));
  if (currentIndex === -1) return;

  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), variants.length - 1);
  showVariant(variants[nextIndex].variant);
}

function hideSearchResultsOnSmallScreens() {
  if (window.matchMedia("(max-width: 430px)").matches && els.searchInput.value.trim()) {
    els.searchResults.scrollTop = 0;
  }
}

function setSearchOpen(open) {
  document.body.classList.toggle("search-open", open);
  els.searchToggle.setAttribute("aria-expanded", String(open));
  els.searchToggle.textContent = open ? "Close" : "Search";

  if (open) {
    els.searchInput.focus();
  }
}

function wireEvents() {
  els.variantSelect.addEventListener("change", (event) => {
    showVariant(event.target.value);
    hideSearchResultsOnSmallScreens();
  });

  els.prevVariant.addEventListener("click", () => moveVariant(-1));
  els.nextVariant.addEventListener("click", () => moveVariant(1));

  els.searchInput.addEventListener("input", renderSearch);

  els.clearSearch.addEventListener("click", () => {
    els.searchInput.value = "";
    renderSearch();
    setSearchOpen(false);
    els.searchInput.focus();
  });

  els.searchToggle.addEventListener("click", () => {
    setSearchOpen(!document.body.classList.contains("search-open"));
  });

  els.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest(".result-button");
    if (!button) return;

    showVariant(button.dataset.variant, button.dataset.task);
    setSearchOpen(false);
  });

  els.tasks.addEventListener("click", (event) => {
    const button = event.target.closest(".section-toggle");
    if (!button) return;

    const content = document.getElementById(button.getAttribute("aria-controls"));
    const expanded = button.getAttribute("aria-expanded") === "true";
    const label = button.dataset.label;

    button.setAttribute("aria-expanded", String(!expanded));
    button.textContent = `${expanded ? "Show" : "Hide"} ${label}`;
    content.hidden = expanded;
  });

  els.taskNav.addEventListener("click", (event) => {
    const link = event.target.closest(".task-nav-link");
    if (!link) return;

    const task = document.querySelector(link.getAttribute("href"));
    task?.focus({ preventScroll: true });
  });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    variants = normalizeExamData(await response.json());
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

document.addEventListener("mathjax-ready", () => {
  queueMathTypeset(els.tasks);
});

init();

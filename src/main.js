import { DATA_URL } from "./config.js";
import { normalizeExamData } from "./data-normalizer.js";
import { els } from "./dom.js";
import { findVariant } from "./exam.js";
import { queueMathTypeset } from "./math.js";
import { getSearchResults, renderSearchResult } from "./search.js";
import { renderVariant } from "./render.js";

let variants = [];
let currentLanguage = localStorage.getItem("exam-language") || "ro";

const UI_STRINGS = {
  ro: {
    answerLabel: "Raspuns",
    clearSearch: "Curata cautarea",
    close: "Inchide",
    conditionLabel: "Cerinta",
    emptySearch: "Cauta dupa subiect sau termen in varianta curenta si in celelalte variante.",
    hide: "Ascunde",
    imagesLabel: "Imagini",
    languageLabel: "Limba",
    next: "Urmatorul",
    noResults: "Nu am gasit intrebari potrivite.",
    placeholder: "senzori, STDIO, PID",
    prev: "Anteriorul",
    search: "Cauta",
    searchLabel: "Cauta intrebari",
    searchResults: (count, query) => `${count} rezultat${count === 1 ? "" : "e"} pentru „${query}”`,
    show: "Arata",
    variantLabel: "Varianta",
    variantSubtitle: (count) => `${count} taskuri cu cerinte, raspunsuri si diagrame`,
    variantWord: "Varianta",
  },
  en: {
    answerLabel: "Answer",
    clearSearch: "Clear search",
    close: "Close",
    conditionLabel: "Question",
    emptySearch: "Search by topic or keyword across all variants.",
    hide: "Hide",
    imagesLabel: "Images",
    languageLabel: "Language",
    next: "Next",
    noResults: "No matching questions found.",
    placeholder: "sensors, STDIO, PID",
    prev: "Previous",
    search: "Search",
    searchLabel: "Search questions",
    searchResults: (count, query) => `${count} result${count === 1 ? "" : "s"} for “${query}”`,
    show: "Show",
    variantLabel: "Variant",
    variantSubtitle: (count) => `${count} tasks with questions, answers, and diagrams`,
    variantWord: "Variant",
  },
};

function strings() {
  return UI_STRINGS[currentLanguage] || UI_STRINGS.ro;
}

function updateUiText() {
  const copy = strings();
  const currentVariantValue = els.variantSelect.value;
  document.documentElement.lang = currentLanguage;
  document.title = currentLanguage === "ro" ? "Variante examen SEI" : "ES Exam Variants";
  els.clearSearch.textContent = copy.clearSearch;
  els.nextVariant.textContent = copy.next;
  els.prevVariant.textContent = copy.prev;
  els.searchToggle.textContent = document.body.classList.contains("search-open") ? copy.close : copy.search;
  document.querySelector('label[for="variantSelect"]').textContent = copy.variantLabel;
  document.querySelector('label[for="searchInput"]').textContent = copy.searchLabel;
  document.querySelector('label[for="languageSelect"]').textContent = copy.languageLabel;
  els.searchInput.placeholder = copy.placeholder;
  if (variants.length) {
    els.variantSelect.innerHTML = variants
      .map((variant) => `<option value="${variant.variant}">${copy.variantWord} ${variant.variant}</option>`)
      .join("");
    els.variantSelect.value = currentVariantValue || String(variants[0].variant);
  }
}

function renderSearch() {
  const query = els.searchInput.value.trim();
  const copy = strings();

  if (!query) {
    els.searchMeta.textContent = copy.emptySearch;
    els.searchResults.innerHTML = "";
    return;
  }

  const matches = getSearchResults(variants, query, currentLanguage);

  els.searchMeta.textContent = copy.searchResults(matches.length, query);
  els.searchResults.innerHTML = matches.length
    ? matches.map((result) => renderSearchResult(result, copy.variantWord)).join("")
    : `<p class="empty">${copy.noResults}</p>`;
}

function showVariant(number, highlightTaskKey = null) {
  renderVariant(els, findVariant(variants, number), currentLanguage, strings(), highlightTaskKey);
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
  const copy = strings();
  document.body.classList.toggle("search-open", open);
  els.searchToggle.setAttribute("aria-expanded", String(open));
  els.searchToggle.textContent = open ? copy.close : copy.search;

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
  els.languageSelect.addEventListener("change", (event) => {
    currentLanguage = event.target.value;
    localStorage.setItem("exam-language", currentLanguage);
    updateUiText();
    showVariant(els.variantSelect.value || variants[0].variant);
    renderSearch();
  });

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
    const showText = button.dataset.show;
    const hideText = button.dataset.hide;

    button.setAttribute("aria-expanded", String(!expanded));
    button.textContent = `${expanded ? showText : hideText} ${label}`;
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
    els.languageSelect.value = currentLanguage;
    updateUiText();

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

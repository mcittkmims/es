import { conditionText, taskEntries } from "./exam.js";
import { escapeHtml, normalizeText } from "./utils.js";

export function matchesSearch(text, query) {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return true;

  if (normalizedQuery.length <= 3) {
    return normalizedText.split(/[^a-z0-9]+/).includes(normalizedQuery);
  }

  return normalizedText.includes(normalizedQuery);
}

export function makeSnippet(text, query) {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return text.replace(/\s+/g, " ").trim().slice(0, 120);

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 90);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

export function getSearchResults(variants, query) {
  return variants.flatMap((variant) =>
    taskEntries(variant)
      .filter(({ task, title, label }) => {
        const searchable = `${variant.variant} ${label} ${title}`;
        return matchesSearch(searchable, query);
      })
      .map(({ key, task, label, title }) => ({
        key,
        label,
        title,
        variant: variant.variant,
        snippet: makeSnippet(conditionText(task.condition), query),
      }))
  );
}

export function renderSearchResult(result) {
  return `
    <button class="result-button" type="button" data-variant="${result.variant}" data-task="${result.key}">
      <strong>Variant ${result.variant} · ${escapeHtml(result.label)}</strong>
      <span>${escapeHtml(result.title)}</span>
      <span>${escapeHtml(result.snippet)}</span>
    </button>
  `;
}

import { highlightCode, isCodeLine } from "./code-highlight.js";
import { conditionText, taskEntries } from "./exam.js";
import { escapeAttribute, escapeHtml } from "./utils.js";

export function renderAnswerText(text) {
  const lines = text.split("\n");
  const blocks = [];
  let prose = [];
  let list = [];
  let code = [];
  let inCode = false;

  function flushProse() {
    if (!prose.length) return;
    blocks.push({ type: "prose", text: prose.join("\n").trim() });
    prose = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: "list", items: [...list] });
    list = [];
  }

  function flushCode() {
    if (!code.length) return;
    blocks.push({ type: "code", text: code.join("\n").replace(/\s+$/, "") });
    code = [];
  }

  lines.forEach((line) => {
    const startsCodeBlock = line.trim().toLowerCase().startsWith("cod critic comentat:");

    if (startsCodeBlock) {
      flushList();
      flushProse();
      blocks.push({ type: "prose", text: line.trim() });
      inCode = true;
      return;
    }

    if (inCode || isCodeLine(line)) {
      flushList();
      flushProse();
      code.push(line);
      inCode = true;
      return;
    }

    if (!line.trim() && inCode) {
      code.push(line);
      return;
    }

    if (!line.trim()) {
      flushCode();
      inCode = false;
      flushList();
      flushProse();
      return;
    }

    if (line.trim().startsWith("- ")) {
      flushCode();
      inCode = false;
      flushProse();
      list.push(line.trim().slice(2));
      return;
    }

    flushCode();
    inCode = false;
    prose.push(line);
  });

  flushCode();
  flushList();
  flushProse();

  return blocks
    .filter((block) => block.text || block.items?.length)
    .map((block) => {
      if (block.type === "code") {
        return `<pre class="code-block"><code>${highlightCode(block.text)}</code></pre>`;
      }

      if (block.type === "list") {
        return `
          <ul class="answer-list">
            ${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        `;
      }

      const trimmed = block.text.trim();
      if (/^[^:\n]+:\s*$/.test(trimmed)) {
        return `<h4 class="answer-subhead">${escapeHtml(trimmed.slice(0, -1))}</h4>`;
      }

      if (/^\\\(.+\\\)$/.test(trimmed) || /^\\\[.+\\\]$/.test(trimmed)) {
        return `<div class="answer-formula">${escapeHtml(trimmed)}</div>`;
      }

      return `<p class="answer-prose">${escapeHtml(block.text)}</p>`;
    })
    .join("");
}

export function renderImage(image) {
  const captionParts = [
    image.caption,
    image.source_pdf && `Source: ${image.source_pdf}`,
    image.page && `page ${image.page}`,
  ].filter(Boolean);

  return `
    <figure>
      <img src="${escapeAttribute(image.path)}" alt="${escapeAttribute(image.caption || "Exam diagram")}">
      <figcaption class="caption">${escapeHtml(captionParts.join(" · "))}</figcaption>
    </figure>
  `;
}

function renderSection({ content, hidden = false, id, label, modifier = "" }) {
  const buttonText = hidden ? `Show ${label}` : `Hide ${label}`;

  return `
    <section class="section-block ${modifier}">
      <button class="section-toggle" type="button" aria-expanded="${hidden ? "false" : "true"}" aria-controls="${id}" data-label="${escapeAttribute(label)}">
        ${escapeHtml(buttonText)}
      </button>
      <div class="section-content" id="${id}" ${hidden ? "hidden" : ""}>
        ${content}
      </div>
    </section>
  `;
}

function renderTaskNav(entries) {
  return entries
    .map(({ key, label, title }) => `
      <a class="task-nav-link" href="#${key}" aria-label="Jump to ${escapeAttribute(label)}: ${escapeAttribute(title)}">
        ${escapeHtml(label)}
      </a>
    `)
    .join("");
}

export function renderVariant(els, variant, highlightTaskKey = null) {
  if (!variant) return;

  const entries = taskEntries(variant);

  els.variantSelect.value = String(variant.variant);
  els.variantTitle.textContent = `Variant ${variant.variant}`;
  els.variantSubtitle.textContent = `${entries.length} tasks with conditions, answers, and diagrams`;
  els.taskNav.innerHTML = renderTaskNav(entries);

  els.tasks.innerHTML = entries
    .map(({ key, task, label, title }) => {
      const coverScreenMode = window.matchMedia("(max-width: 390px) and (max-height: 450px)").matches;
      const images = Array.isArray(task.images) ? task.images : [];
      const condition = conditionText(task.condition);
      const conditionId = `${key}_condition`;
      const answerId = `${key}_answer`;
      const imagesId = `${key}_images`;
      const conditionMarkup = condition
        ? renderSection({
            content: `<div class="condition">${escapeHtml(condition)}</div>`,
            hidden: coverScreenMode,
            id: conditionId,
            label: "Condition",
          })
        : "";
      const imageMarkup = images.length
        ? renderSection({
            content: `<div class="images">${images.map(renderImage).join("")}</div>`,
            hidden: true,
            id: imagesId,
            label: `Images (${images.length})`,
            modifier: "image-block",
          })
        : "";

      return `
        <article class="task-card ${key === highlightTaskKey ? "highlighted" : ""}" id="${key}" tabindex="-1">
          <div class="task-header">
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(title)}</p>
          </div>
          ${conditionMarkup}
          ${renderSection({
            content: `<div class="answer">${renderAnswerText(task.exam_text)}</div>`,
            id: answerId,
            label: "Answer",
            modifier: "answer-block",
          })}
          ${imageMarkup}
        </article>
      `;
    })
    .join("");

  if (highlightTaskKey) {
    const highlightedTask = document.querySelector(`#${highlightTaskKey}`);
    highlightedTask?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    highlightedTask?.focus({ preventScroll: true });
  }
}

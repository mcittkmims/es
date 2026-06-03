import { highlightCode, isCodeLine } from "./code-highlight.js";
import { conditionText, taskEntries } from "./exam.js";
import { escapeAttribute, escapeHtml } from "./utils.js";

export function renderAnswerText(text) {
  const lines = text.split("\n");
  const blocks = [];
  let prose = [];
  let code = [];
  let inCode = false;

  function flushProse() {
    if (!prose.length) return;
    blocks.push({ type: "prose", text: prose.join("\n").trim() });
    prose = [];
  }

  function flushCode() {
    if (!code.length) return;
    blocks.push({ type: "code", text: code.join("\n").replace(/\s+$/, "") });
    code = [];
  }

  lines.forEach((line) => {
    const startsCodeBlock = line.trim().toLowerCase().startsWith("cod critic comentat:");

    if (startsCodeBlock) {
      flushProse();
      blocks.push({ type: "prose", text: line.trim() });
      inCode = true;
      return;
    }

    if (inCode || isCodeLine(line)) {
      flushProse();
      code.push(line);
      inCode = true;
      return;
    }

    if (!line.trim() && inCode) {
      code.push(line);
      return;
    }

    flushCode();
    inCode = false;
    prose.push(line);
  });

  flushCode();
  flushProse();

  return blocks
    .filter((block) => block.text)
    .map((block) => {
      if (block.type === "code") {
        return `<pre class="code-block"><code>${highlightCode(block.text)}</code></pre>`;
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
      const imageMarkup = images.length
        ? `
          <details class="section-block image-block">
            <summary>Images (${images.length})</summary>
            <div class="images">${images.map(renderImage).join("")}</div>
          </details>
        `
        : "";

      return `
        <article class="task-card ${key === highlightTaskKey ? "highlighted" : ""}" id="${key}" tabindex="-1">
          <div class="task-header">
            <h3>${escapeHtml(label)}</h3>
            <p>${escapeHtml(title)}</p>
          </div>
          <details class="section-block" ${coverScreenMode ? "" : "open"}>
            <summary>Condition</summary>
            <div class="condition">${escapeHtml(condition)}</div>
          </details>
          <details class="section-block answer-block" open>
            <summary>Answer</summary>
            <div class="answer">${renderAnswerText(task.exam_text)}</div>
          </details>
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

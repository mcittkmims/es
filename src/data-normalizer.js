function titleFromKey(key) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanPromptPrefix(text) {
  return text
    .replace(/^(Problema|Задача)\s*:\s*/i, "")
    .trim();
}

function normalizeAssetPath(path) {
  if (!path) return "";

  return path
    .replace(/^embedded_exam_resolved_assets_sei_style\//, "images/sei_style/");
}

function conciseTitle(text) {
  const cleaned = cleanPromptPrefix(text).replace(/\s+/g, " ").trim();
  const sentence = cleaned.match(/^(.+?[.!?])(\s|$)/)?.[1] || cleaned;
  return sentence.length > 120 ? `${sentence.slice(0, 117).trim()}...` : sentence;
}

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(", ");
  return Object.entries(value)
    .map(([key, nested]) => `${titleFromKey(key)}: ${stringifyValue(nested)}`)
    .filter(Boolean)
    .join("; ");
}

function firstMeaningfulLine(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function bodyWithoutFirstLine(text) {
  const lines = text.split("\n");
  const firstIndex = lines.findIndex((line) => line.trim());
  if (firstIndex === -1) return text;
  return lines.slice(firstIndex + 1).join("\n").trim();
}

function extractPseudoTitle(text) {
  const match = text.match(/PSEUDOCOD\s*-\s*([^\n]+)/i);
  return match?.[1]?.trim() || "";
}

function stripLeadingLabel(text, label) {
  return text.replace(new RegExp(`^${label}\\s*:\\s*\\n?`, "i"), "").trim();
}

function isMathOnlyText(value) {
  return typeof value === "string" && (/^\s*\\\(.+\\\)\s*$/.test(value) || /^\s*\\\[.+\\\]\s*$/.test(value));
}

function toDisplayMath(value) {
  if (/^\s*\\\(.+\\\)\s*$/.test(value)) {
    return value.replace(/^\s*\\\(/, "\\[").replace(/\\\)\s*$/, "\\]");
  }

  return value;
}

function formatList(items) {
  return items
    .map((item) => `- ${stringifyValue(item)}`)
    .join("\n");
}

function formatSection(label, value) {
  if (value == null) return "";

  if (typeof value === "string") {
    if (isMathOnlyText(value)) {
      return `${label}:\n\n${toDisplayMath(value)}`;
    }

    return `${label}:\n${value}`;
  }

  if (Array.isArray(value)) {
    if (!value.length) return "";
    return `${label}:\n${formatList(value)}`;
  }

  const lines = Object.entries(value)
    .map(([key, nested]) => `- ${titleFromKey(key)}: ${stringifyValue(nested)}`)
    .join("\n");

  return lines ? `${label}:\n${lines}` : "";
}

function toImage(relativePath, caption, extra = {}) {
  if (!relativePath) return null;

  return {
    path: normalizeAssetPath(relativePath),
    caption,
    source_pdf: extra.source_pdf,
    page: extra.page,
  };
}

function seiImage(path, caption) {
  if (!path) return null;
  return { path: normalizeAssetPath(path), caption };
}

function normalizeSeiAnswerBody(taskKey, answer) {
  if (!answer) return "";

  if (taskKey !== "task_3") {
    return bodyWithoutFirstLine(answer);
  }

  return stripLeadingLabel(answer, "Abordare scurtă");
}

function normalizeSeiTask(taskKey, task) {
  const rawAnswer = task.answer || "";
  const title = taskKey === "task_3"
    ? extractPseudoTitle(rawAnswer) || firstMeaningfulLine(rawAnswer)
    : firstMeaningfulLine(rawAnswer);

  const images = [];

  if (task.diagram_path) {
    images.push(seiImage(task.diagram_path, "Diagramă pentru task 1"));
  }

  if (Array.isArray(task.diagram_paths)) {
    task.diagram_paths.forEach((path, index) => {
      images.push(seiImage(path, `Diagramă suport ${index + 1}`));
    });
  }

  if (task.electrical_diagram_path) {
    images.push(seiImage(task.electrical_diagram_path, "Diagramă interconectare electrică"));
  }

  if (task.program_block_diagram_path) {
    images.push(seiImage(task.program_block_diagram_path, "Diagramă bloc program"));
  }

  return {
    title,
    condition: "",
    exam_text: normalizeSeiAnswerBody(taskKey, rawAnswer),
    images: images.filter(Boolean),
  };
}

function normalizeTask1(commonTask1, task1) {
  const examText = [
    `Definiție: ${commonTask1.definition}`,
    "",
    "Componente și roluri:",
    formatList(commonTask1.component_roles.map(({ component, role }) => `${component}: ${role}`)),
    "",
    `Flux arhitectural: ${commonTask1.short_architecture_flow}`,
    "",
    task1.student_style_summary ? `Rezumat pentru examen: ${task1.student_style_summary}` : "",
  ].filter(Boolean).join("\n");

  return {
    title: "Structura generică a unui dispozitiv IoT",
    condition: task1.original_task,
    exam_text: examText,
    images: [
      toImage(commonTask1.diagram.relative_path, commonTask1.diagram.note || "Diagrama generică IoT"),
    ].filter(Boolean),
  };
}

function normalizeTask2(task2) {
  const solution = task2.solution || {};
  const sections = [
    formatList(solution.succinct_answer || []),
  ];

  Object.entries(solution).forEach(([key, value]) => {
    if (key === "title" || key === "succinct_answer") return;
    sections.push("", formatSection(titleFromKey(key), value));
  });

  return {
    title: solution.title || "Task 2",
    condition: task2.original_task,
    exam_text: sections.filter(Boolean).join("\n"),
    images: (task2.matching_slide_diagrams || [])
      .map((image) => toImage(image.relative_path, image.reason_strict_match, image))
      .filter(Boolean),
  };
}

function normalizeTableRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";
  return formatList(rows.map((row) => Object.entries(row)
    .map(([key, value]) => `${titleFromKey(key)}: ${value}`)
    .join("; ")));
}

function normalizeTask3(task3) {
  const examText = [
    formatList(task3.short_approach || []),
    "",
    task3.state_or_parameter_table?.length
      ? `Stări / parametri:\n${normalizeTableRows(task3.state_or_parameter_table)}`
      : "",
    "",
    "Interconectare electrică: vezi imaginile atașate.",
    "",
    "Schema bloc program: vezi imaginile atașate.",
    "",
    "Cod critic comentat:",
    task3.critical_commented_source_code || "",
  ].filter(Boolean).join("\n");

  const images = [
    toImage(
      task3.electrical_interconnection_diagram?.diagram_png?.relative_path,
      "Diagramă randată pentru interconectarea electrică",
    ),
    toImage(
      task3.functional_program_block_diagram?.diagram_png?.relative_path,
      "Diagramă randată pentru schema bloc a programului",
    ),
  ].filter(Boolean);

  return {
    title: conciseTitle(typeof task3.original_task === "string" ? task3.original_task : task3.original_task?.text || "Task 3"),
    condition: task3.original_task,
    exam_text: examText,
    images,
  };
}

function normalizeLatexData(raw) {
  const commonTask1 = raw.common_task_1_solution;

  return raw.variants.map((variant) => ({
    variant: variant.variant,
    answer: {
      task_1: normalizeTask1(commonTask1, variant.task_1),
      task_2: normalizeTask2(variant.task_2),
      task_3: normalizeTask3(variant.task_3),
    },
  }));
}

function normalizeSeiData(raw) {
  return raw.map((variant) => ({
    variant: variant.variant,
    answer: {
      task_1: normalizeSeiTask("task_1", variant.task_1),
      task_2: normalizeSeiTask("task_2", variant.task_2),
      task_3: normalizeSeiTask("task_3", variant.task_3),
    },
  }));
}

export function normalizeExamData(raw) {
  if (Array.isArray(raw) && raw[0]?.task_1?.answer) return normalizeSeiData(raw);
  if (Array.isArray(raw)) return raw;
  if (raw?.variants && raw?.common_task_1_solution) return normalizeLatexData(raw);
  return [];
}

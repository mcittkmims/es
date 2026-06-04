export function taskLabel(taskKey) {
  return taskKey.replace("task_", "Task ");
}

export function conditionText(condition) {
  if (!condition) return "";
  if (typeof condition === "string") return condition;

  const details = Array.isArray(condition.implementation_details)
    ? condition.implementation_details.map((item) => `- ${item}`).join("\n")
    : "";

  return [condition.text, details].filter(Boolean).join("\n\nImplementation details:\n");
}

export function taskTitle(task) {
  if (task.title) return task.title;

  const firstLine = task.exam_text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || "Untitled question";
}

export function taskEntries(variant) {
  return Object.entries(variant.answer).map(([key, task]) => ({
    key,
    task,
    label: taskLabel(key),
    title: taskTitle(task),
  }));
}

export function findVariant(variants, number) {
  return variants.find((variant) => variant.variant === Number(number));
}

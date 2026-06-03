import { escapeHtml } from "./utils.js";

export function isCodeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  return /^(#define|#include|\/\/|bool |byte |char |const |FILE |float |int |long |return |Serial\.|uint\d+_t |void )/.test(trimmed)
    || /^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(trimmed)
    || /^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(trimmed)
    || /^[{};]/.test(trimmed)
    || /[{};]$/.test(trimmed);
}

export function highlightCode(code) {
  const placeholders = [];
  let html = escapeHtml(code);

  function stash(className, value) {
    const token = String.fromCharCode(0xe000 + placeholders.length);
    placeholders.push(`<span class="${className}">${value}</span>`);
    return token;
  }

  html = html.replace(/\/\/[^\n]*/g, (match) => stash("tok-comment", match));
  html = html.replace(/"([^"\\]|\\.)*"/g, (match) => stash("tok-string", match));
  html = html.replace(/^\s*#\w+.*/gm, (match) => stash("tok-macro", match));
  html = html.replace(/\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
  html = html.replace(/\b(bool|byte|char|const|define|else|false|FILE|float|for|if|int|long|nullptr|return|true|uint8_t|uint16_t|uint32_t|void|while)\b/g, '<span class="tok-keyword">$1</span>');
  html = html.replace(/\b(Serial|lcd|stdout|FDEV_SETUP_STREAM)\b/g, '<span class="tok-api">$1</span>');
  html = html.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g, '<span class="tok-function">$1</span>');

  placeholders.forEach((value, index) => {
    html = html.replaceAll(String.fromCharCode(0xe000 + index), value);
  });

  return html;
}

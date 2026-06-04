let pendingTypeset = Promise.resolve();

export function queueMathTypeset(target) {
  if (!target || !window.__mathJaxReady || !window.MathJax?.typesetPromise) {
    return Promise.resolve();
  }

  pendingTypeset = pendingTypeset.then(async () => {
    try {
      window.MathJax.typesetClear?.([target]);
      await window.MathJax.typesetPromise([target]);
    } catch (error) {
      console.error("MathJax typeset failed", error);
    }
  });

  return pendingTypeset;
}

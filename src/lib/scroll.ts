/**
 * Scrolls whatever is scrolling `el` back to the top. Inside the phone frame that is its inner
 * pane, not the window, so `window.scrollTo` alone leaves a new step or page starting halfway
 * down wherever the last one was scrolled to.
 */
export function scrollToTop(el: Element | null) {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      node.scrollTop = 0;
      break;
    }
    node = node.parentElement;
  }
  window.scrollTo?.({ top: 0 });
}

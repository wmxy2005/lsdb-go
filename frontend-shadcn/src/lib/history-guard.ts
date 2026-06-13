/**
 * Make the browser Back button (and mobile back gesture) dismiss transient
 * overlays — image/video previews, lightboxes, the edit sheet — instead of
 * navigating the SPA route.
 *
 * Call when an overlay OPENS: it pushes a throwaway history entry (same URL) and
 * registers the overlay's `close` on a shared LIFO stack. A single `popstate`
 * listener pops the top overlay per Back press, so nested overlays (e.g. an
 * image preview opened inside the edit sheet) close one layer at a time.
 *
 * Returns a `release` to call when the overlay is dismissed by the UI (button /
 * Esc / outside click): it removes the overlay from the stack and — if it was on
 * top and Back hasn't already consumed its entry — pops that entry so history
 * stays balanced.
 */
type GuardFrame = { close: () => void; closedByBack: boolean };

const stack: GuardFrame[] = [];
let listening = false;

function hasGuardEntry(): boolean {
  return (window.history.state as { __historyGuard?: boolean } | null)?.__historyGuard === true;
}

function onPopState() {
  // Back press: close only the topmost overlay; leave the rest open.
  const frame = stack.pop();
  if (frame) {
    frame.closedByBack = true;
    frame.close();
  }
  if (stack.length === 0) {
    window.removeEventListener('popstate', onPopState);
    listening = false;
  }
}

export function guardHistoryBack(close: () => void): () => void {
  const frame: GuardFrame = { close, closedByBack: false };
  stack.push(frame);
  window.history.pushState({ __historyGuard: true }, '');
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }

  return () => {
    const idx = stack.lastIndexOf(frame);
    if (idx === -1) return; // already removed by a Back press
    const wasTop = idx === stack.length - 1;
    stack.splice(idx, 1);
    if (!frame.closedByBack && wasTop && hasGuardEntry()) {
      window.history.back();
    }
    if (stack.length === 0) {
      window.removeEventListener('popstate', onPopState);
      listening = false;
    }
  };
}

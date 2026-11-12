import { afterEach } from 'vitest';

// jsdom has no <dialog> modal support; trust-ui's Dialog calls showModal()/close().
//
// Like a browser, `close` is fired asynchronously (a queued task) after close() has returned. trust-ui 2.x's
// Dialog reports that event through onClose even for a close it triggered itself, so tests must see it. The
// pending events are tracked so a test can fire them deterministically (flushDialogClose) instead of sleeping,
// and so none can fire after a test has ended.
const pending = new Map<ReturnType<typeof setTimeout>, () => void>();

/** Fires every pending `close` event now (wrap in act() when it may update React state). */
export function flushDialogClose() {
  for (const [timer, fire] of [...pending]) {
    clearTimeout(timer);
    pending.delete(timer);
    fire();
  }
}

if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    const fire = () => {
      if (this.isConnected) this.dispatchEvent(new Event('close'));
    };
    const timer = setTimeout(() => {
      pending.delete(timer);
      fire();
    }, 0);
    pending.set(timer, fire);
  };
}

afterEach(() => {
  for (const timer of pending.keys()) clearTimeout(timer);
  pending.clear();
});

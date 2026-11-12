import '@testing-library/jest-dom/vitest';

// Node 22+ ships its own global `localStorage` that shadows jsdom's and warns when
// used without --localstorage-file. Give tests a plain in-memory Storage instead.
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

// jsdom has no <dialog> modal support; trust-ui's Dialog calls showModal()/close().
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    // Like a browser, `close` is fired asynchronously (a queued task), after close() has returned. trust-ui 2.2.0's
    // Dialog reports that event through onClose even for a close it triggered itself, so tests must see it.
    setTimeout(() => this.dispatchEvent(new Event('close')), 0);
  };
}

// jsdom does not implement scrollIntoView (trust-ui's Select calls it when opening).
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

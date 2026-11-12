import type { KeyboardEvent } from 'react';

/**
 * Enter/Space activation for a non-button element with role="button".
 * Keys pressed on nested controls (e.g. the × button) are left to them.
 */
export function onActivateKey(activate: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };
}

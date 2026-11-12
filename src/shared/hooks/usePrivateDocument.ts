import { useEffect } from 'react';

/**
 * For public pages whose address carries a secret (share token, password link): keeps the address out of Referer
 * headers while the page is open and sets the tab title.
 */
export function usePrivateDocument(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, [title]);
}

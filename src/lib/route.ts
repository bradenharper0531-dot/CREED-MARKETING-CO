import { useEffect, useState } from 'react';

/* Tiny hash router. The public site uses plain anchors (#pillars, #markets…);
   the owner dashboard lives under "#/dashboard", so the two never collide and
   the site stays a single static page that any host can serve. */
export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export const DASH = '#/dashboard';

export function go(hash: string) {
  window.location.hash = hash;
  window.scrollTo(0, 0);
}

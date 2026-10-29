'use client';

import { useEffect } from 'react';

// Clerk's modal (and our own dialog-based modals) lock scroll with `body.style.overflow = 'hidden'`,
// which iOS Safari ignores for touchmove — the page behind the modal still rubber-band scrolls.
// Watching for that inline style and additionally pinning the body with `position: fixed` fixes it
// across every modal in the app, not just Clerk's.
export default function ClerkScrollLockFix() {
  useEffect(() => {
    let savedScrollY = 0;
    let locked = false;

    const lock = () => {
      if (locked) return;
      locked = true;
      savedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollY);
    };

    const observer = new MutationObserver(() => {
      const isHidden = document.body.style.overflow === 'hidden';
      if (isHidden && !locked) lock();
      else if (!isHidden && locked) unlock();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      if (locked) unlock();
    };
  }, []);

  return null;
}

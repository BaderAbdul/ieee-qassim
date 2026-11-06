'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const AdminTopbarActionsContext = createContext<{
  actions: ReactNode;
  setActions: (node: ReactNode) => void;
} | null>(null);

export function AdminTopbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <AdminTopbarActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </AdminTopbarActionsContext.Provider>
  );
}

/**
 * Lets an admin page render its own buttons inside the shared top navbar.
 *
 * IMPORTANT: wrap `node` in `useMemo` (keyed on whatever it actually depends on, e.g. locale and
 * a count) before passing it here. A freshly-created JSX literal on every render makes this
 * effect re-fire on every render of the calling page too -- which has twice now been the actual
 * cause of "the sidebar stops navigating once you've visited this page" (the registration churn
 * starves out React's low-priority navigation transition until it never commits). Passing an
 * inline `<>...</>` or `<button>...</button>` literal directly is the bug, not a style choice.
 */
export function useAdminTopbarActions(node: ReactNode) {
  const ctx = useContext(AdminTopbarActionsContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setActions(node);
    return () => ctx.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}

export function useAdminTopbarActionsSlot() {
  return useContext(AdminTopbarActionsContext)?.actions ?? null;
}

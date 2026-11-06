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

/** Lets an admin page render its own buttons inside the shared top navbar. */
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

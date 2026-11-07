'use client';

import { useState, type ReactNode } from 'react';

export interface AdminTab {
  key: string;
  label: string;
  content: ReactNode;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  /** Controlled mode: when provided (with onActiveKeyChange), the tab bar below is suppressed --
   * the caller is rendering its own tab switcher elsewhere (e.g. in the top navbar). */
  activeKey?: string;
  onActiveKeyChange?: (key: string) => void;
  hideTabBar?: boolean;
}

export default function AdminTabs({ tabs, activeKey: controlledKey, onActiveKeyChange, hideTabBar }: AdminTabsProps) {
  const [uncontrolledKey, setUncontrolledKey] = useState(tabs[0]?.key);
  const activeKey = controlledKey ?? uncontrolledKey;
  const setActiveKey = onActiveKeyChange ?? setUncontrolledKey;
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  if (!tabs.length) return null;

  return (
    <div className="space-y-5">
      {!hideTabBar && tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              aria-current={tab.key === active?.key ? 'page' : undefined}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab.key === active?.key
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : 'bg-[var(--color-surface)]/60 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      {/* Every tab's content stays mounted (just hidden) instead of being torn down when you
          switch away -- otherwise coming back to a tab re-ran its whole fetch-then-spinner cycle,
          which read as the page "refreshing" on every switch. */}
      {tabs.map((tab) => (
        <div key={tab.key} className={tab.key === activeKey ? '' : 'hidden'}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}

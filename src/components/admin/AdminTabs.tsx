'use client';

import { useState, type ReactNode } from 'react';

export interface AdminTab {
  key: string;
  label: string;
  content: ReactNode;
}

export default function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  if (!tabs.length) return null;

  return (
    <div className="space-y-5">
      {tabs.length > 1 && (
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
      <div>{active?.content}</div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';

export interface Privilege { key: string; feature: string; action: string; labelAr: string; labelEn: string }

function groupByFeature(privileges: Privilege[]): Map<string, Privilege[]> {
  const groups = new Map<string, Privilege[]>();
  for (const privilege of privileges) {
    const list = groups.get(privilege.feature) ?? [];
    list.push(privilege);
    groups.set(privilege.feature, list);
  }
  return groups;
}

export function PrivilegeGrid({ privileges, selected, onChange, disabled, isAr }: {
  privileges: Privilege[]; selected: Set<string>; onChange: (next: Set<string>) => void; disabled?: boolean; isAr: boolean;
}) {
  const groups = useMemo(() => groupByFeature(privileges), [privileges]);
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };
  const toggleFeature = (keys: string[], allSelected: boolean) => {
    const next = new Set(selected);
    for (const key of keys) { if (allSelected) next.delete(key); else next.add(key); }
    onChange(next);
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[...groups.entries()].map(([feature, items]) => {
        const keys = items.map(item => item.key);
        const allSelected = keys.every(key => selected.has(key));
        return (
          <div key={feature} className="rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 font-bold text-sm text-gray-800 mb-2">
              <input type="checkbox" checked={allSelected} disabled={disabled}
                     onChange={() => toggleFeature(keys, allSelected)} />
              {feature}
            </label>
            <div className="space-y-1 ps-1">
              {items.map(item => (
                <label key={item.key} className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={selected.has(item.key)} disabled={disabled} onChange={() => toggle(item.key)} />
                  {isAr ? item.labelAr : item.labelEn} <span className="text-gray-400">({item.action})</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


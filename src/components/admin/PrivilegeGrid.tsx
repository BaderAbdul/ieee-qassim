'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Privilege { key: string; feature: string; action: string; labelAr: string; labelEn: string }

const FEATURES: Record<string, [string, string]> = {
  events: ['الفعاليات', 'Events'], event_status: ['حالة الفعالية', 'Event status'], registrations: ['التسجيلات', 'Registrations'],
  attendance: ['الحضور', 'Attendance'], certificates: ['الشهادات', 'Certificates'], certificate_templates: ['قوالب الشهادات', 'Certificate templates'],
  email_templates: ['قوالب البريد', 'E-mail templates'], mail: ['البريد', 'Mail'], feedback: ['التقييمات', 'Feedback'],
  members: ['الأعضاء والطلاب', 'Members & students'], points: ['النقاط', 'Points'], content: ['محتوى الموقع', 'Site content'],
  media: ['الوسائط', 'Media'], showcase: ['معرض المشاريع', 'Showcase'], ideas: ['الأفكار', 'Ideas'], operations: ['مركز المهام', 'Task center'],
  projects: ['المشاريع', 'Projects'], tasks: ['المهام', 'Tasks'], goals: ['الأهداف', 'Goals'], cross_team_requests: ['طلبات بين الفرق', 'Cross-team requests'],
  academic_calendar: ['التقويم الأكاديمي', 'Academic calendar'], calendar_events: ['التقويم: الفعاليات', 'Calendar: events'],
  calendar_projects: ['التقويم: المشاريع', 'Calendar: projects'], calendar_tasks: ['التقويم: المهام', 'Calendar: tasks'],
};
export const featureLabel = (feature: string, isAr: boolean) => FEATURES[feature]?.[isAr ? 0 : 1] ?? feature;

function groupByFeature(privileges: Privilege[]): [string, Privilege[]][] {
  const groups = new Map<string, Privilege[]>();
  for (const privilege of privileges) groups.set(privilege.feature, [...(groups.get(privilege.feature) ?? []), privilege]);
  return [...groups.entries()];
}

/**
 * Privileges grouped by feature as accordions: three columns on wide screens, two on medium, one on phones.
 * `renderItem` draws one privilege; `countOf` says how many of a group's privileges are "on" (shown beside its name).
 */
export function PrivilegeAccordion({ privileges, isAr, renderItem, countOf, headerExtra, defaultOpen = false }: {
  privileges: Privilege[]; isAr: boolean;
  renderItem: (privilege: Privilege) => ReactNode;
  countOf: (items: Privilege[]) => number;
  headerExtra?: (items: Privilege[]) => ReactNode;
  defaultOpen?: boolean;
}) {
  const groups = useMemo(() => groupByFeature(privileges), [privileges]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen ? groups.map(([feature]) => feature) : []));
  const toggle = (feature: string) => setOpen(previous => { const next = new Set(previous); if (next.has(feature)) next.delete(feature); else next.add(feature); return next; });
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
      {groups.map(([feature, items]) => {
        const isOpen = open.has(feature);
        const on = countOf(items);
        return (
          <section key={feature} className={`rounded-2xl border bg-[var(--color-surface)] shadow-xs transition-colors ${on ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-border)]'}`}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(feature)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-start">
                <ChevronDown size={16} className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? '' : '-rotate-90 rtl:rotate-90'}`} />
                <span className="truncate text-sm font-black text-[var(--color-text-primary)]">{featureLabel(feature, isAr)}</span>
                <span dir="ltr" className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${on === items.length ? 'bg-emerald-100 text-emerald-700' : on ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}`}>{on}/{items.length}</span>
              </button>
              {headerExtra?.(items)}
            </div>
            <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="space-y-1 border-t border-[var(--color-border)]/60 px-3 pb-3 pt-2">{items.map(item => <div key={item.key}>{renderItem(item)}</div>)}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Pick privileges with checkboxes (roles' minimums, a team's maximum). */
export function PrivilegeGrid({ privileges, selected, onChange, disabled, isAr }: {
  privileges: Privilege[]; selected: Set<string>; onChange: (next: Set<string>) => void; disabled?: boolean; isAr: boolean;
}) {
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };
  const toggleAll = (keys: string[], all: boolean) => {
    const next = new Set(selected);
    for (const key of keys) { if (all) next.delete(key); else next.add(key); }
    onChange(next);
  };
  return (
    <PrivilegeAccordion privileges={privileges} isAr={isAr}
      countOf={items => items.filter(item => selected.has(item.key)).length}
      headerExtra={items => {
        const keys = items.map(item => item.key);
        const all = keys.every(key => selected.has(key));
        return <input type="checkbox" aria-label={isAr ? 'تحديد كل المجموعة' : 'Select the whole group'} className="h-4 w-4 shrink-0 cursor-pointer" checked={all} disabled={disabled} onChange={() => toggleAll(keys, all)} />;
      }}
      renderItem={item => (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]">
          <input type="checkbox" checked={selected.has(item.key)} disabled={disabled} onChange={() => toggle(item.key)} />
          <span className="flex-1">{isAr ? item.labelAr : item.labelEn}</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{item.action}</span>
        </label>
      )} />
  );
}

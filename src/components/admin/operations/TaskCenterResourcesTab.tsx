'use client';

import { useState } from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { RESOURCE_DOCUMENTS, RESOURCE_SECTIONS } from '@/lib/taskCenter';
import { card } from './taskCenterUi';

export default function TaskCenterResourcesTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [activeId, setActiveId] = useState(RESOURCE_SECTIONS[0].id);
  const active = RESOURCE_SECTIONS.find(section => section.id === activeId) || RESOURCE_SECTIONS[0];

  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
    <div className={`${card} space-y-5 p-6`}>
      <h2 className="text-xl font-bold">{isAr ? active.titleAr : active.titleEn}</h2>
      <p className="leading-relaxed text-[var(--color-text-secondary)]">{isAr ? active.bodyAr : active.bodyEn}</p>
      {activeId === 'goal' && (
        <div className="rounded-xl bg-[var(--color-accent-soft)] p-4">
          <p className="mb-1 font-bold text-[var(--color-accent)]">{t('القاعدة الذهبية', 'The golden rule')}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('"القيادة ليست منصباً بل مسؤولية، والتنظيم هو الفارق بين الجهد الضائع والإنجاز العظيم."',
               '"Leadership isn’t a title, it’s a responsibility -- and organization is what separates wasted effort from great achievement."')}
          </p>
        </div>
      )}
    </div>

    <div className="space-y-4">
      <div className={`${card} p-3`}>
        <p className="flex items-center gap-2 px-2 py-1.5 text-sm font-bold"><BookOpen size={15} />{t('دليل القيادة', 'Leadership guide')}</p>
        <nav className="mt-1 space-y-1">
          {RESOURCE_SECTIONS.map(section => (
            <button key={section.id} type="button" onClick={() => setActiveId(section.id)}
                    className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-bold transition-colors ${activeId === section.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'hover:bg-[var(--color-surface-2)]'}`}>
              {isAr ? section.titleAr : section.titleEn}
            </button>
          ))}
        </nav>
      </div>
      <div className={`${card} p-3`}>
        <p className="px-2 py-1.5 text-sm font-bold">{t('الوثائق والمراجع', 'Documents & references')}</p>
        <ul className="mt-1 space-y-1">
          {RESOURCE_DOCUMENTS.map(doc => (
            <li key={doc.ar} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              <FileText size={14} />{isAr ? doc.ar : doc.en}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>;
}

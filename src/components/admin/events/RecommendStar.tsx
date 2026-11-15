'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star } from 'lucide-react';
import { apiSend } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export interface Recommendation { userId: string; name: string; teams: { ar: string; en: string }[] }

/**
 * A star beside a registered student: staff use it to say "have a look at this one". It does not choose anyone.
 * Hovering shows who recommended the student and from which team; clicking adds or withdraws your own recommendation.
 */
export default function RecommendStar({ isAr, eventId, userId, items, onChange }: {
  isAr: boolean; eventId: string | number; userId: string; items: Recommendation[]; onChange: (next: Recommendation[]) => void;
}) {
  const { userData } = useAuth();
  const { showToast } = useToast();
  const button = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const me = userData?.id;
  const mine = !!me && items.some(item => item.userId === me);
  const t = (ar: string, en: string) => isAr ? ar : en;

  const show = () => {
    const box = button.current?.getBoundingClientRect();
    if (box) setTip({ x: Math.min(Math.max(box.left + box.width / 2, 140), window.innerWidth - 140), y: box.bottom + 8 });
  };

  const toggle = async () => {
    if (busy || !userData) return;
    setBusy(true);
    try {
      const path = `/api/admin/events/${eventId}/registrations/${encodeURIComponent(userId)}/recommendation`;
      await apiSend(mine ? 'DELETE' : 'PUT', path);
      const teams = (userData.teams ?? []).map(team => ({ ar: team.nameAr ?? '', en: team.nameEn ?? team.nameAr ?? '' })).filter(team => team.ar || team.en);
      const name = userData.arabicFullName || userData.displayName || '';
      onChange(mine ? items.filter(item => item.userId !== me) : [...items, { userId: me ?? '', name, teams }]);
    } catch (reason) { showToast(reason instanceof Error ? reason.message : t('تعذر حفظ التوصية.', 'Could not save the recommendation.'), 'error'); }
    finally { setBusy(false); }
  };

  const line = (item: Recommendation) => {
    const teams = item.teams.map(team => isAr ? team.ar : team.en).filter(Boolean).join(isAr ? '، ' : ', ');
    return isAr
      ? `${item.name}${teams ? ` من قسم ${teams}` : ''} قام بتوصية هذا الطالب`
      : `${item.name}${teams ? ` from ${teams}` : ''} recommended this student`;
  };

  return (
    <>
      <button ref={button} type="button" onClick={() => void toggle()} onMouseEnter={show} onMouseLeave={() => setTip(null)} onFocus={show} onBlur={() => setTip(null)}
              disabled={busy} aria-pressed={mine}
              aria-label={items.length ? t(`توصيات الإدارة: ${items.length}`, `Staff recommendations: ${items.length}`) : t('توصية بهذا الطالب', 'Recommend this student')}
              className={`inline-flex shrink-0 items-center gap-0.5 rounded-md p-1 transition-colors disabled:opacity-60 ${items.length ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400'}`}>
        <Star size={16} className={items.length ? 'fill-amber-400' : ''} />
        {items.length > 1 && <span className="text-[10px] font-black text-amber-600">{items.length}</span>}
      </button>
      {tip && typeof document !== 'undefined' && createPortal(
        <div role="tooltip" style={{ position: 'fixed', left: tip.x, top: tip.y, transform: 'translateX(-50%)', zIndex: 300 }}
             className="pointer-events-none w-64 max-w-[calc(100vw-1rem)] space-y-1.5 rounded-xl bg-slate-900 p-3 text-start text-xs leading-5 text-white shadow-xl">
          {items.length === 0
            ? <p>{t('اضغط لتوصية هذا الطالب (للاطلاع عليه فقط).', 'Click to recommend this student (just to have a look).')}</p>
            : items.map(item => <p key={item.userId} className="font-bold">⭐ {line(item)}</p>)}
          {items.length > 0 && <p className="border-t border-white/15 pt-1.5 text-[10px] font-normal text-slate-300">{t('التوصية لا تعني أن الطالب مختار، بل لفت النظر إليه.', 'A recommendation does not mean the student is chosen — it only asks to take a look.')}{mine ? ` ${t('اضغط لإلغاء توصيتك.', 'Click to withdraw yours.')}` : ''}</p>}
        </div>, document.body)}
    </>
  );
}

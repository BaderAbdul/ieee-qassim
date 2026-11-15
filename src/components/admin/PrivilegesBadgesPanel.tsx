'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';
import { apiSend } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from './AdminData';
import { Award, Shield, X } from 'lucide-react';
import { PrivilegeAccordion, type Privilege } from './PrivilegeGrid';

interface Badge { key: string; nameAr: string; nameEn: string; privileges: string[] }
interface Override { privilegeKey: string; granted: boolean }
interface MemberOverview {
  member: {
    id: string; role: string; roleNameAr?: string; roleNameEn?: string;
    badges: { key: string; nameAr: string; nameEn: string }[];
    privilegeOverrides: Override[];
    teams: { id: string; nameAr: string; nameEn: string; isLeader: boolean }[];
    effectivePrivileges: string[];
  };
  canManagePrivileges: boolean;
  // null = unrestricted (super_admin, or no cap configured on the team this was delegated
  // through); otherwise the exact privilege keys a team leader/vice-leader may still grant.
  privilegeCeiling: string[] | null;
}

export default function PrivilegesBadgesPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const isAr = useLocale() === 'ar';
  const [data, setData] = useState<MemberOverview | null>(null);
  const [catalog, setCatalog] = useState<Privilege[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [overview, p, b] = await Promise.all([
        httpsCallable<unknown, MemberOverview>(null, 'getMemberOverview')({ userId }),
        apiGetArray<Privilege>('/api/admin/privileges'),
        apiGetArray<Badge>('/api/admin/badges'),
      ]);
      setData(overview.data);
      setCatalog(p); setBadges(b);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load privileges'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [userId]);

  const overrideFor = (key: string) => data?.member.privilegeOverrides.find(o => o.privilegeKey === key);
  // Revoking is never capped -- only granting (the "+" / badge-on button) is. null = unrestricted.
  const grantAllowed = (key: string) => !data || data.privilegeCeiling === null || data.privilegeCeiling.includes(key);

  const setOverride = async (key: string, granted: boolean | null) => {
    setBusy(true); setError(null);
    try { await apiSend('PATCH', `/api/admin/users/${encodeURIComponent(userId)}/privileges`, { privilegeKey: key, granted }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update privilege'); }
    finally { setBusy(false); }
  };

  const toggleBadge = async (badgeKey: string, has: boolean) => {
    setBusy(true); setError(null);
    try {
      await apiSend(has ? 'DELETE' : 'POST', `/api/admin/users/${encodeURIComponent(userId)}/badges/${encodeURIComponent(badgeKey)}`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update badge'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={isAr ? 'الصلاحيات والأوسمة' : 'Privileges & badges'} onClick={event => event.stopPropagation()}
           className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-l from-sky-50 to-white px-5 py-4">
          <h3 className="flex items-center gap-2 font-cairo text-lg font-black text-slate-900"><Shield size={18} className="text-[#00629B]" />{isAr ? 'الصلاحيات والأوسمة' : 'Privileges & Badges'}</h3>
          <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          {loading && <AdminLoading />}
          {error && <AdminError message={error} retry={load} />}
          {data && !loading && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[#00629B]/10 px-3 py-1 font-bold text-[#00629B]">{isAr ? 'الدور' : 'Role'}: {isAr ? data.member.roleNameAr : data.member.roleNameEn}</span>
                {data.member.teams.map(t => (
                  <span key={t.id} className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">{isAr ? t.nameAr : t.nameEn}{t.isLeader ? (isAr ? ' · قائد' : ' · leader') : ''}</span>
                ))}
                <span className="ms-auto text-slate-400">{isAr ? `${data.member.effectivePrivileges.length} صلاحية فعلية` : `${data.member.effectivePrivileges.length} effective privileges`}</span>
              </div>

              {!data.canManagePrivileges && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
                  {isAr ? 'للعرض فقط: لا يمكنك تعديل صلاحيات هذا المستخدم.' : "Read-only: you can't edit this user's privileges."}
                </p>
              )}

              <div>
                <p className="mb-2 text-sm font-black text-slate-800">{isAr ? 'الأوسمة الإدارية' : 'Admin badges'}</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map(badge => {
                    const has = data.member.badges.some(b => b.key === badge.key);
                    const blocked = !has && badge.privileges.some(p => !grantAllowed(p));
                    return (
                      <button key={badge.key} type="button" disabled={busy || !data.canManagePrivileges || blocked}
                              onClick={() => toggleBadge(badge.key, has)}
                              title={blocked ? (isAr ? 'يتجاوز الحد الأقصى لصلاحيات الفريق' : "Beyond your team's privilege ceiling") : undefined}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${has ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'} disabled:opacity-50`}>
                        <Award size={13} />{isAr ? badge.nameAr : badge.nameEn}
                      </button>
                    );
                  })}
                  {badges.length === 0 && <p className="text-xs text-slate-400">{isAr ? 'لا توجد أوسمة معرّفة بعد.' : 'No badges defined yet.'}</p>}
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-black text-slate-800">{isAr ? 'الصلاحيات الفعلية' : 'Effective privileges'}</p>
                <p className="mb-3 text-[11px] text-slate-500">{isAr ? 'افتح أي مجموعة لتعديل صلاحياتها: «+» منح مباشر، «−» سحب مباشر، «تراجع» يعيدها لما يقرره الدور والأوسمة.' : 'Open a group to edit it: “+” grants directly, “−” revokes directly, “reset” returns to what the role and badges decide.'}</p>
                <PrivilegeAccordion privileges={catalog} isAr={isAr}
                  countOf={items => items.filter(item => data.member.effectivePrivileges.includes(item.key)).length}
                  renderItem={privilege => {
                    const override = overrideFor(privilege.key);
                    const effective = data.member.effectivePrivileges.includes(privilege.key);
                    return (
                      <div className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-xs hover:bg-slate-50">
                        <span className={`flex-1 ${effective ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                          {isAr ? privilege.labelAr : privilege.labelEn}
                          {override && <span className={`ms-1 text-[10px] ${override.granted ? 'text-emerald-600' : 'text-rose-600'}`}>({isAr ? 'مباشر' : 'direct'})</span>}
                        </span>
                        {data.canManagePrivileges && (
                          <div className="flex shrink-0 gap-1">
                            <button type="button" disabled={busy || !grantAllowed(privilege.key)} onClick={() => setOverride(privilege.key, true)}
                                    title={!grantAllowed(privilege.key) ? (isAr ? 'يتجاوز الحد الأقصى لصلاحيات الفريق' : "Beyond your team's privilege ceiling") : undefined}
                                    className={`rounded-md px-2 py-0.5 font-bold disabled:opacity-40 ${override?.granted === true ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>+</button>
                            <button type="button" disabled={busy} onClick={() => setOverride(privilege.key, false)}
                                    className={`rounded-md px-2 py-0.5 font-bold ${override?.granted === false ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>−</button>
                            {override && (
                              <button type="button" disabled={busy} onClick={() => setOverride(privilege.key, null)}
                                      className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-500 hover:bg-slate-200">{isAr ? 'تراجع' : 'reset'}</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

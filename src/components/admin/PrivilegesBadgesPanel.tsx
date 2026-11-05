'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { httpsCallable } from '@/lib/backend';
import { apiSend } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from './AdminData';
import { Award, Shield, X } from 'lucide-react';

interface Privilege { key: string; feature: string; action: string; labelAr: string; labelEn: string }
interface Badge { key: string; nameAr: string; nameEn: string }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold font-cairo flex items-center gap-2"><Shield size={18} />{isAr ? 'الصلاحيات والأوسمة' : 'Privileges & Badges'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {loading && <AdminLoading />}
          {error && <AdminError message={error} retry={load} />}
          {data && !loading && (
            <>
              <p className="text-sm text-gray-600">
                {isAr ? 'الدور' : 'Role'}: <strong>{isAr ? data.member.roleNameAr : data.member.roleNameEn}</strong>
                {data.member.teams.length > 0 && (
                  <span className="ms-2 text-gray-400">
                    · {data.member.teams.map(t => `${isAr ? t.nameAr : t.nameEn}${t.isLeader ? ' (leader)' : ''}`).join(', ')}
                  </span>
                )}
              </p>

              {!data.canManagePrivileges && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  {isAr ? 'للعرض فقط: لا يمكنك تعديل صلاحيات هذا المستخدم.' : 'Read-only: you can\'t edit this user\'s privileges.'}
                </p>
              )}

              <div>
                <p className="text-sm font-bold text-gray-800 mb-2">{isAr ? 'الأوسمة الإدارية' : 'Admin badges'}</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map(badge => {
                    const has = data.member.badges.some(b => b.key === badge.key);
                    return (
                      <button key={badge.key} type="button" disabled={busy || !data.canManagePrivileges}
                              onClick={() => toggleBadge(badge.key, has)}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${has ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'} disabled:opacity-50`}>
                        <Award size={12} />{isAr ? badge.nameAr : badge.nameEn}
                      </button>
                    );
                  })}
                  {badges.length === 0 && <p className="text-xs text-gray-400">{isAr ? 'لا توجد أوسمة معرّفة بعد.' : 'No badges defined yet.'}</p>}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-800 mb-2">{isAr ? 'الصلاحيات الفعلية' : 'Effective privileges'}</p>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {catalog.map(privilege => {
                    const override = overrideFor(privilege.key);
                    const effective = data.member.effectivePrivileges.includes(privilege.key);
                    return (
                      <div key={privilege.key} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                        <span className={effective ? 'text-gray-800' : 'text-gray-400'}>
                          {isAr ? privilege.labelAr : privilege.labelEn}
                          {override && <span className={`ms-1 ${override.granted ? 'text-emerald-600' : 'text-rose-600'}`}>({isAr ? 'تعديل مباشر' : 'override'})</span>}
                        </span>
                        {data.canManagePrivileges && (
                          <div className="flex gap-1">
                            <button type="button" disabled={busy} onClick={() => setOverride(privilege.key, true)}
                                    className={`rounded px-2 py-0.5 ${override?.granted === true ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>+</button>
                            <button type="button" disabled={busy} onClick={() => setOverride(privilege.key, false)}
                                    className={`rounded px-2 py-0.5 ${override?.granted === false ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'}`}>-</button>
                            {override && (
                              <button type="button" disabled={busy} onClick={() => setOverride(privilege.key, null)}
                                      className="rounded px-2 py-0.5 bg-gray-100 text-gray-500">{isAr ? 'تراجع' : 'reset'}</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

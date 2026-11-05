'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiSend } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { Award, Plus, Trash2 } from 'lucide-react';

interface Privilege { key: string; feature: string; action: string; labelAr: string; labelEn: string }
interface Badge { key: string; nameAr: string; nameEn: string; icon: string | null; privileges: string[] }

function groupByFeature(privileges: Privilege[]): Map<string, Privilege[]> {
  const groups = new Map<string, Privilege[]>();
  for (const privilege of privileges) {
    const list = groups.get(privilege.feature) ?? [];
    list.push(privilege);
    groups.set(privilege.feature, list);
  }
  return groups;
}

export default function AdminBadgesPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSelection, setEditSelection] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newBadge, setNewBadge] = useState({ key: '', nameAr: '', nameEn: '' });
  const [newSelection, setNewSelection] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupByFeature(privileges), [privileges]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [p, b] = await Promise.all([apiGetArray<Privilege>('/api/admin/privileges'), apiGetArray<Badge>('/api/admin/badges')]);
      setPrivileges(p); setBadges(b);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load badges'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  if (userData && userData.isSuperAdmin !== true) {
    return <AdminError message={isAr ? 'إدارة الأوسمة مخصصة للمدير العام.' : 'Badge management requires super admin access.'} />;
  }
  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  const grid = (selected: Set<string>, onChange: (next: Set<string>) => void) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {[...groups.entries()].map(([feature, items]) => {
        const keys = items.map(i => i.key);
        const allSelected = keys.every(k => selected.has(k));
        return (
          <div key={feature} className="rounded-xl border border-gray-200 p-3">
            <label className="flex items-center gap-2 font-bold text-sm text-gray-800 mb-2">
              <input type="checkbox" checked={allSelected}
                     onChange={() => { const next = new Set(selected); for (const k of keys) { if (allSelected) next.delete(k); else next.add(k); } onChange(next); }} />
              {feature}
            </label>
            <div className="space-y-1 ps-1">
              {items.map(item => (
                <label key={item.key} className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={selected.has(item.key)}
                         onChange={() => { const next = new Set(selected); if (next.has(item.key)) next.delete(item.key); else next.add(item.key); onChange(next); }} />
                  {isAr ? item.labelAr : item.labelEn} <span className="text-gray-400">({item.action})</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const createBadge = async () => {
    if (!newBadge.key || !newBadge.nameAr || !newBadge.nameEn) return;
    setBusy(true); setError(null);
    try {
      await apiSend('POST', '/api/admin/badges', { ...newBadge, privileges: [...newSelection] });
      setCreating(false); setNewBadge({ key: '', nameAr: '', nameEn: '' }); setNewSelection(new Set());
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create badge'); }
    finally { setBusy(false); }
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    setBusy(true); setError(null);
    try { await apiSend('PATCH', `/api/admin/badges/${encodeURIComponent(editingKey)}`, { privileges: [...editSelection] }); setEditingKey(null); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save badge'); }
    finally { setBusy(false); }
  };

  const deleteBadge = async (key: string) => {
    if (!window.confirm(isAr ? 'حذف هذا الوسام؟' : 'Delete this badge?')) return;
    setBusy(true); setError(null);
    try { await apiSend('DELETE', `/api/admin/badges/${encodeURIComponent(key)}`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete badge'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cairo">{isAr ? 'الأوسمة الإدارية' : 'Admin Badges'}</h1>
          <p className="text-gray-500 text-sm">{isAr ? 'حزمة صلاحيات إضافية تُمنح لأي مستخدم دون تغيير دوره.' : 'A bundle of extra privileges granted to a user without changing their role.'}</p>
        </div>
        <button type="button" onClick={() => setCreating(value => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
          <Plus size={16} />{isAr ? 'وسام جديد' : 'New badge'}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input placeholder={isAr ? 'المفتاح' : 'key'} value={newBadge.key}
                   onChange={e => setNewBadge({ ...newBadge, key: e.target.value.trim().toLowerCase() })} className="rounded-lg border px-3 py-2 text-sm" dir="ltr" />
            <input placeholder={isAr ? 'الاسم بالعربي' : 'Arabic name'} value={newBadge.nameAr}
                   onChange={e => setNewBadge({ ...newBadge, nameAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'} value={newBadge.nameEn}
                   onChange={e => setNewBadge({ ...newBadge, nameEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          {grid(newSelection, setNewSelection)}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={createBadge} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isAr ? 'إنشاء' : 'Create'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {badges.map(badge => (
          <div key={badge.key} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <div>
                  <p className="font-bold text-gray-900">{isAr ? badge.nameAr : badge.nameEn} <span className="text-gray-400 text-xs">({badge.key})</span></p>
                  <p className="text-xs text-gray-500">{badge.privileges.length} {isAr ? 'صلاحية' : 'privileges'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setEditingKey(badge.key); setEditSelection(new Set(badge.privileges)); }}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold hover:bg-gray-200">
                  {isAr ? 'تعديل' : 'Edit'}
                </button>
                <button type="button" onClick={() => deleteBadge(badge.key)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {editingKey === badge.key && (
              <div className="mt-3 border-t pt-3 space-y-3">
                {grid(editSelection, setEditSelection)}
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={saveEdit} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingKey(null)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

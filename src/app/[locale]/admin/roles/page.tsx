'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiSend } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { useToast } from '@/context/ToastContext';
import { Plus, Shield, ShieldAlert, Trash2 } from 'lucide-react';

interface Privilege { key: string; feature: string; action: string; labelAr: string; labelEn: string }
interface RoleRow { key: string; nameAr: string; nameEn: string; tier: number; isSystem: boolean; isAdminRole: boolean; privileges: string[] }

function groupByFeature(privileges: Privilege[]): Map<string, Privilege[]> {
  const groups = new Map<string, Privilege[]>();
  for (const privilege of privileges) {
    const list = groups.get(privilege.feature) ?? [];
    list.push(privilege);
    groups.set(privilege.feature, list);
  }
  return groups;
}

function PrivilegeGrid({ privileges, selected, onChange, disabled, isAr }: {
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

export default function AdminRolesPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSelection, setEditSelection] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState({ key: '', nameAr: '', nameEn: '', tier: 2 });
  const [newSelection, setNewSelection] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [p, r] = await Promise.all([apiGetArray<Privilege>('/api/admin/privileges'), apiGetArray<RoleRow>('/api/admin/roles')]);
      setPrivileges(p); setRoles(r);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load roles'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  if (userData && userData.isSuperAdmin !== true) {
    return <AdminError message={isAr ? 'إدارة الأدوار مخصصة للمدير العام.' : 'Role management requires super admin access.'} />;
  }
  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  const startEdit = (role: RoleRow) => { setEditingKey(role.key); setEditSelection(new Set(role.privileges)); };

  const saveEdit = async () => {
    if (!editingKey) return;
    setBusy(true);
    try {
      await apiSend('PATCH', `/api/admin/roles/${encodeURIComponent(editingKey)}`, { privileges: [...editSelection] });
      setEditingKey(null);
      await load();
      showToast(isAr ? 'تم الحفظ.' : 'Saved.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save role', 'error'); }
    finally { setBusy(false); }
  };

  const createRole = async () => {
    if (!newRole.key || !newRole.nameAr || !newRole.nameEn) return;
    setBusy(true);
    try {
      await apiSend('POST', '/api/admin/roles', { ...newRole, privileges: [...newSelection] });
      setCreating(false); setNewRole({ key: '', nameAr: '', nameEn: '', tier: 2 }); setNewSelection(new Set());
      await load();
      showToast(isAr ? 'تم إنشاء الدور.' : 'Role created.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to create role', 'error'); }
    finally { setBusy(false); }
  };

  const deleteRole = async (key: string) => {
    if (!window.confirm(isAr ? 'حذف هذا الدور؟' : 'Delete this role?')) return;
    setBusy(true);
    try { await apiSend('DELETE', `/api/admin/roles/${encodeURIComponent(key)}`); await load(); showToast(isAr ? 'تم الحذف.' : 'Deleted.', 'success'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to delete role', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cairo">{isAr ? 'الأدوار والصلاحيات' : 'Roles & Privileges'}</h1>
          <p className="text-gray-500 text-sm">{isAr ? 'لكل دور قائمة صلاحيات قابلة للتعديل، لكل ميزة.' : 'Each role has an editable, per-feature privilege list.'}</p>
        </div>
        <button type="button" onClick={() => setCreating(value => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
          <Plus size={16} />{isAr ? 'دور جديد' : 'New role'}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder={isAr ? 'المفتاح (مثال: media_lead)' : 'key (e.g. media_lead)'} value={newRole.key}
                   onChange={e => setNewRole({ ...newRole, key: e.target.value.trim().toLowerCase() })}
                   className="rounded-lg border px-3 py-2 text-sm" dir="ltr" />
            <input placeholder={isAr ? 'الاسم بالعربي' : 'Arabic name'} value={newRole.nameAr}
                   onChange={e => setNewRole({ ...newRole, nameAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'} value={newRole.nameEn}
                   onChange={e => setNewRole({ ...newRole, nameEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            {isAr ? 'المستوى (1 = قائد، 2 = عضو، يمكن استخدام أي رقم أعلى)' : 'Tier (1 = leader-like, 2 = member-like, higher is weaker)'}
            <input type="number" min={1} max={100} value={newRole.tier}
                   onChange={e => setNewRole({ ...newRole, tier: Number(e.target.value) })} className="w-20 rounded-lg border px-2 py-1" />
          </label>
          <PrivilegeGrid privileges={privileges} selected={newSelection} onChange={setNewSelection} isAr={isAr} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={createRole} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isAr ? 'إنشاء' : 'Create'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {roles.sort((a, b) => a.tier - b.tier).map(role => (
          <div key={role.key} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {role.key === 'super_admin' ? <ShieldAlert size={18} className="text-purple-600" /> : <Shield size={18} className="text-gray-400" />}
                <div>
                  <p className="font-bold text-gray-900">{isAr ? role.nameAr : role.nameEn} <span className="text-gray-400 text-xs">({role.key})</span></p>
                  <p className="text-xs text-gray-500">{isAr ? `المستوى ${role.tier}` : `Tier ${role.tier}`} · {role.privileges.length} {isAr ? 'صلاحية' : 'privileges'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {role.key !== 'super_admin' && (
                  <button type="button" onClick={() => startEdit(role)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold hover:bg-gray-200">
                    {isAr ? 'تعديل الصلاحيات' : 'Edit privileges'}
                  </button>
                )}
                {!role.isSystem && (
                  <button type="button" onClick={() => deleteRole(role.key)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            {editingKey === role.key && (
              <div className="mt-3 border-t pt-3 space-y-3">
                <PrivilegeGrid privileges={privileges} selected={editSelection} onChange={setEditSelection} isAr={isAr} />
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

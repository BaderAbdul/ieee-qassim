'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiSend } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { Plus, Trash2, UserMinus, UserPlus } from 'lucide-react';

interface TeamMember { userId: string; teamRole: 'leader' | 'member'; displayName: string; role: string }
interface Team { id: string; nameAr: string; nameEn: string; members: TeamMember[] }

export default function AdminTeamsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTeam, setNewTeam] = useState({ id: '', nameAr: '', nameEn: '' });
  const [memberForm, setMemberForm] = useState<Record<string, { userId: string; teamRole: 'leader' | 'member' }>>({});

  const load = async () => {
    setLoading(true); setError(null);
    try { setTeams(await apiGetArray<Team>('/api/admin/teams')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load teams'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  if (userData && userData.isSuperAdmin !== true) {
    return <AdminError message={isAr ? 'إدارة الفرق مخصصة للمدير العام.' : 'Team management requires super admin access.'} />;
  }
  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  const createTeam = async () => {
    if (!newTeam.id || !newTeam.nameAr || !newTeam.nameEn) return;
    setBusy(true); setError(null);
    try { await apiSend('POST', '/api/admin/teams', newTeam); setCreating(false); setNewTeam({ id: '', nameAr: '', nameEn: '' }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create team'); }
    finally { setBusy(false); }
  };

  const deleteTeam = async (id: string) => {
    if (!window.confirm(isAr ? 'حذف هذا الفريق؟' : 'Delete this team?')) return;
    setBusy(true); setError(null);
    try { await apiSend('DELETE', `/api/admin/teams/${encodeURIComponent(id)}`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete team'); }
    finally { setBusy(false); }
  };

  const saveMembers = async (team: Team, members: TeamMember[]) => {
    setBusy(true); setError(null);
    try {
      await apiSend('PUT', `/api/admin/teams/${encodeURIComponent(team.id)}/members`, {
        members: members.map(m => ({ userId: m.userId, teamRole: m.teamRole })),
      });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update members'); }
    finally { setBusy(false); }
  };

  const addMember = (team: Team) => {
    const form = memberForm[team.id];
    if (!form?.userId) return;
    void saveMembers(team, [...team.members.filter(m => m.userId !== form.userId), { userId: form.userId, teamRole: form.teamRole, displayName: form.userId, role: '' }]);
    setMemberForm({ ...memberForm, [team.id]: { userId: '', teamRole: 'member' } });
  };

  const removeMember = (team: Team, userId: string) => {
    void saveMembers(team, team.members.filter(m => m.userId !== userId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cairo">{isAr ? 'الفرق' : 'Teams'}</h1>
          <p className="text-gray-500 text-sm">
            {isAr ? 'قائد الفريق يمكنه إدارة صلاحيات وأوسمة أعضاء فريقه فقط.' : 'A team leader can manage privileges & badges only for their own team members.'}
          </p>
        </div>
        <button type="button" onClick={() => setCreating(value => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
          <Plus size={16} />{isAr ? 'فريق جديد' : 'New team'}
        </button>
      </div>

      {creating && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input placeholder={isAr ? 'المعرف (مثال: web-team)' : 'id (e.g. web-team)'} value={newTeam.id}
                   onChange={e => setNewTeam({ ...newTeam, id: e.target.value.trim().toLowerCase() })} className="rounded-lg border px-3 py-2 text-sm" dir="ltr" />
            <input placeholder={isAr ? 'الاسم بالعربي' : 'Arabic name'} value={newTeam.nameAr}
                   onChange={e => setNewTeam({ ...newTeam, nameAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'} value={newTeam.nameEn}
                   onChange={e => setNewTeam({ ...newTeam, nameEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={createTeam} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {isAr ? 'إنشاء' : 'Create'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {teams.map(team => (
          <div key={team.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">{isAr ? team.nameAr : team.nameEn} <span className="text-gray-400 text-xs">({team.id})</span></p>
              <button type="button" onClick={() => deleteTeam(team.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            </div>
            <ul className="mt-3 divide-y divide-gray-100">
              {team.members.map(member => (
                <li key={member.userId} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {member.displayName} ({member.userId})
                    <span className={`ms-2 rounded px-2 py-0.5 text-xs font-bold ${member.teamRole === 'leader' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {member.teamRole === 'leader' ? (isAr ? 'قائد' : 'Leader') : (isAr ? 'عضو' : 'Member')}
                    </span>
                  </span>
                  <button type="button" onClick={() => removeMember(team, member.userId)} className="text-gray-400 hover:text-red-500">
                    <UserMinus size={16} />
                  </button>
                </li>
              ))}
              {team.members.length === 0 && <li className="py-2 text-sm text-gray-400">{isAr ? 'لا يوجد أعضاء بعد.' : 'No members yet.'}</li>}
            </ul>
            <div className="mt-3 flex gap-2">
              <input placeholder={isAr ? 'معرف المستخدم' : 'User id'} value={memberForm[team.id]?.userId ?? ''}
                     onChange={e => setMemberForm({ ...memberForm, [team.id]: { userId: e.target.value.trim(), teamRole: memberForm[team.id]?.teamRole ?? 'member' } })}
                     className="flex-1 rounded-lg border px-3 py-1.5 text-sm" dir="ltr" />
              <select value={memberForm[team.id]?.teamRole ?? 'member'}
                      onChange={e => setMemberForm({ ...memberForm, [team.id]: { userId: memberForm[team.id]?.userId ?? '', teamRole: e.target.value as 'leader' | 'member' } })}
                      className="rounded-lg border px-2 py-1.5 text-sm">
                <option value="member">{isAr ? 'عضو' : 'Member'}</option>
                <option value="leader">{isAr ? 'قائد' : 'Leader'}</option>
              </select>
              <button type="button" disabled={busy} onClick={() => addMember(team)} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold hover:bg-gray-200">
                <UserPlus size={14} />{isAr ? 'إضافة' : 'Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

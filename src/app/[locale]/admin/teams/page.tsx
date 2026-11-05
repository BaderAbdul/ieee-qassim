'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiSend, httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import type { MemberSearchResult } from '@/lib/adminTypes';
import { ArrowDown, ArrowUp, Edit2, Plus, Trash2, UserMinus, X } from 'lucide-react';

interface TeamMember { userId: string; teamRole: 'leader' | 'member'; position: number; displayName: string; role: string }
interface Team {
  id: string; nameAr: string; nameEn: string; descriptionAr: string | null; descriptionEn: string | null;
  icon: string | null; position: number; isPublic: boolean; members: TeamMember[];
}
interface SearchResultUser { id: string; email?: string; displayName?: string; arabicFullName?: string; photoURL?: string }

export default function AdminTeamsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTeam, setNewTeam] = useState({ id: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState({ nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true });
  const [memberPicker, setMemberPicker] = useState<{ teamId: string; teamRole: 'leader' | 'member' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const sortedTeams = [...teams].sort((a, b) => a.position - b.position);

  const createTeam = async () => {
    if (!newTeam.id || !newTeam.nameAr || !newTeam.nameEn) return;
    setBusy(true); setError(null);
    try {
      await apiSend('POST', '/api/admin/teams', {
        id: newTeam.id, nameAr: newTeam.nameAr, nameEn: newTeam.nameEn, isPublic: newTeam.isPublic,
        descriptionAr: newTeam.descriptionAr || null, descriptionEn: newTeam.descriptionEn || null, icon: newTeam.icon || null,
      });
      setCreating(false);
      setNewTeam({ id: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create team'); }
    finally { setBusy(false); }
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditTeam({ nameAr: team.nameAr, nameEn: team.nameEn, descriptionAr: team.descriptionAr ?? '', descriptionEn: team.descriptionEn ?? '', icon: team.icon ?? '', isPublic: team.isPublic });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true); setError(null);
    try {
      await apiSend('PATCH', `/api/admin/teams/${encodeURIComponent(editingId)}`, {
        nameAr: editTeam.nameAr, nameEn: editTeam.nameEn, isPublic: editTeam.isPublic,
        descriptionAr: editTeam.descriptionAr || null, descriptionEn: editTeam.descriptionEn || null, icon: editTeam.icon || null,
      });
      setEditingId(null);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save team'); }
    finally { setBusy(false); }
  };

  const deleteTeam = async (id: string) => {
    if (!window.confirm(isAr ? 'حذف هذا الفريق؟' : 'Delete this team?')) return;
    setBusy(true); setError(null);
    try { await apiSend('DELETE', `/api/admin/teams/${encodeURIComponent(id)}`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete team'); }
    finally { setBusy(false); }
  };

  const reorderTeams = async (order: string[]) => {
    setBusy(true); setError(null);
    try { await apiSend('PUT', '/api/admin/teams/order', { order }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to reorder teams'); }
    finally { setBusy(false); }
  };

  const moveTeam = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedTeams.length) return;
    const order = sortedTeams.map(t => t.id);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    void reorderTeams(order);
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

  const moveMember = (team: Team, index: number, direction: 'up' | 'down') => {
    const members = [...team.members].sort((a, b) => a.position - b.position);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= members.length) return;
    [members[index], members[targetIndex]] = [members[targetIndex], members[index]];
    void saveMembers(team, members);
  };

  const removeMember = (team: Team, userId: string) => {
    void saveMembers(team, team.members.filter(m => m.userId !== userId));
  };

  const searchUsers = async (query: string) => {
    setSearching(true); setError(null);
    try {
      const result = await httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query });
      setSearchResults(result.data.users);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to search members'); }
    finally { setSearching(false); setHasSearched(true); }
  };

  // Search as you type (debounced), same pattern as the Users & Members page.
  useEffect(() => {
    if (!memberPicker) return;
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); setHasSearched(false); return; }
    const timer = window.setTimeout(() => { void searchUsers(query); }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, memberPicker]);

  const addMember = (user: SearchResultUser) => {
    if (!memberPicker) return;
    const team = teams.find(t => t.id === memberPicker.teamId);
    if (!team || team.members.some(m => m.userId === user.id)) return;
    const sorted = [...team.members].sort((a, b) => a.position - b.position);
    void saveMembers(team, [...sorted, { userId: user.id, teamRole: memberPicker.teamRole, position: sorted.length, displayName: '', role: '' }]);
    setMemberPicker(null); setSearchQuery(''); setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cairo">{isAr ? 'الفرق' : 'Teams'}</h1>
          <p className="text-gray-500 text-sm">
            {isAr
              ? 'قائد الفريق يمكنه إدارة صلاحيات وأوسمة أعضاء فريقه فقط. الفرق العلنية تظهر على صفحة "الهيكلة" في الموقع، بالترتيب الظاهر هنا.'
              : 'A team leader can manage privileges & badges only for their own team members. Public teams appear on the website\'s Structure page, in the order shown here.'}
          </p>
        </div>
        <button type="button" onClick={() => setCreating(value => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
          <Plus size={16} />{isAr ? 'فريق جديد' : 'New team'}
        </button>
      </div>

      {error && <AdminError message={error} />}

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
          <div className="grid gap-3 sm:grid-cols-2">
            <textarea placeholder={isAr ? 'الوصف (عربي، اختياري)' : 'Description (Arabic, optional)'} value={newTeam.descriptionAr}
                      onChange={e => setNewTeam({ ...newTeam, descriptionAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" rows={2} />
            <textarea placeholder={isAr ? 'الوصف (إنجليزي، اختياري)' : 'Description (English, optional)'} value={newTeam.descriptionEn}
                      onChange={e => setNewTeam({ ...newTeam, descriptionEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex items-center gap-4">
            <input placeholder={isAr ? 'اسم أيقونة (Lucide، اختياري)' : 'Icon name (Lucide, optional)'} value={newTeam.icon}
                   onChange={e => setNewTeam({ ...newTeam, icon: e.target.value })} className="flex-1 rounded-lg border px-3 py-2 text-sm" dir="ltr" />
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input type="checkbox" checked={newTeam.isPublic} onChange={e => setNewTeam({ ...newTeam, isPublic: e.target.checked })} />
              {isAr ? 'إظهار في صفحة الهيكلة العلنية' : 'Show on public Structure page'}
            </label>
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
        {sortedTeams.map((team, index) => (
          <div key={team.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button type="button" disabled={index === 0} onClick={() => moveTeam(index, 'up')} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp size={14} /></button>
                  <button type="button" disabled={index === sortedTeams.length - 1} onClick={() => moveTeam(index, 'down')} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown size={14} /></button>
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {isAr ? team.nameAr : team.nameEn} <span className="text-gray-400 text-xs">({team.id})</span>
                    {!team.isPublic && <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{isAr ? 'داخلي' : 'internal'}</span>}
                  </p>
                  {(team.descriptionAr || team.descriptionEn) && <p className="text-xs text-gray-500 mt-0.5">{isAr ? team.descriptionAr : team.descriptionEn}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => startEdit(team)} className="rounded-lg bg-gray-100 p-1.5 hover:bg-gray-200"><Edit2 size={14} /></button>
                <button type="button" onClick={() => deleteTeam(team.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>

            {editingId === team.id && (
              <div className="mt-3 border-t pt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={editTeam.nameAr} onChange={e => setEditTeam({ ...editTeam, nameAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" placeholder="Arabic name" />
                  <input value={editTeam.nameEn} onChange={e => setEditTeam({ ...editTeam, nameEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" placeholder="English name" />
                  <textarea value={editTeam.descriptionAr} onChange={e => setEditTeam({ ...editTeam, descriptionAr: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Description (Arabic)" />
                  <textarea value={editTeam.descriptionEn} onChange={e => setEditTeam({ ...editTeam, descriptionEn: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Description (English)" />
                </div>
                <div className="flex items-center gap-4">
                  <input value={editTeam.icon} onChange={e => setEditTeam({ ...editTeam, icon: e.target.value })} className="flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Icon name" dir="ltr" />
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <input type="checkbox" checked={editTeam.isPublic} onChange={e => setEditTeam({ ...editTeam, isPublic: e.target.checked })} />
                    {isAr ? 'إظهار علنيًا' : 'Public'}
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={saveEdit} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isAr ? 'حفظ' : 'Save'}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold">{isAr ? 'إلغاء' : 'Cancel'}</button>
                </div>
              </div>
            )}

            <ul className="mt-3 divide-y divide-gray-100">
              {[...team.members].sort((a, b) => a.position - b.position).map((member, memberIdx) => (
                <li key={member.userId} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" disabled={memberIdx === 0} onClick={() => moveMember(team, memberIdx, 'up')} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp size={12} /></button>
                      <button type="button" disabled={memberIdx === team.members.length - 1} onClick={() => moveMember(team, memberIdx, 'down')} className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown size={12} /></button>
                    </div>
                    <span>
                      {member.displayName} <span className="text-gray-400 text-xs">({member.userId})</span>
                      <span className={`ms-2 rounded px-2 py-0.5 text-xs font-bold ${member.teamRole === 'leader' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {member.teamRole === 'leader' ? (isAr ? 'قائد' : 'Leader') : (isAr ? 'عضو' : 'Member')}
                      </span>
                    </span>
                  </div>
                  <button type="button" onClick={() => removeMember(team, member.userId)} className="text-gray-400 hover:text-red-500"><UserMinus size={16} /></button>
                </li>
              ))}
              {team.members.length === 0 && <li className="py-2 text-sm text-gray-400">{isAr ? 'لا يوجد أعضاء بعد.' : 'No members yet.'}</li>}
            </ul>

            <div className="mt-3 flex gap-2">
              <select onChange={e => {
                        if (e.target.value) {
                          setSearchQuery(''); setSearchResults([]); setHasSearched(false);
                          setMemberPicker({ teamId: team.id, teamRole: e.target.value as 'leader' | 'member' });
                        }
                        e.target.value = '';
                      }}
                      defaultValue="" className="rounded-lg border px-2 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
                <option value="" disabled>{isAr ? '+ إضافة عضو كـ…' : '+ Add member as…'}</option>
                <option value="member">{isAr ? 'عضو' : 'Member'}</option>
                <option value="leader">{isAr ? 'قائد' : 'Leader'}</option>
              </select>
            </div>
          </div>
        ))}
        {sortedTeams.length === 0 && <p className="text-sm text-gray-400">{isAr ? 'لا توجد فرق بعد.' : 'No teams yet.'}</p>}
      </div>

      {memberPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMemberPicker(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold font-cairo">{isAr ? 'إضافة عضو للفريق' : 'Add team member'}</h2>
              <button type="button" onClick={() => setMemberPicker(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{isAr ? 'ابحث بالاسم أو البريد أو الرقم الجامعي — لا حاجة لمعرفة المعرّف.' : "Search by name, email, or university id — no need to know a user's id."}</p>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                       className="w-full border rounded-lg p-2 text-sm" placeholder={isAr ? 'ابحث…' : 'Search…'} autoFocus />
                {searching && <div className="absolute end-2 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-purple-700 border-t-transparent rounded-full" />}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{u.arabicFullName || u.displayName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                  <button type="button" onClick={() => addMember(u)} className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    {isAr ? 'إضافة' : 'Add'}
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && !searching && hasSearched && (
                <div className="text-center text-gray-500 py-8 text-sm">{isAr ? 'لا توجد نتائج مطابقة' : 'No matching results'}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

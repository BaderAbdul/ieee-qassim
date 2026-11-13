'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiSend, httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { useToast } from '@/context/ToastContext';
import { Link } from '@/i18n/routing';
import PrivilegesBadgesPanel from '@/components/admin/PrivilegesBadgesPanel';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
import type { MemberSearchResult } from '@/lib/adminTypes';
import { ArrowDown, ArrowUp, BadgeCheck, Briefcase, Crown, Edit2, KeyRound, Plus, ShieldCheck, Star, Trash2, UserMinus, X } from 'lucide-react';

type TeamRole = 'leader' | 'vice_leader' | 'member';
type TeamKind = 'administrative' | 'specialized';
interface TeamBadge { key: string; nameAr: string; nameEn: string; icon: string | null }
interface TeamMember {
  userId: string; teamRole: TeamRole; position: number; displayName: string; role: string;
  roleNameAr?: string; roleNameEn?: string; totalPoints?: number; adminPoints?: number; badges?: TeamBadge[];
}
const ROLE_TIER: Record<TeamRole, number> = { leader: 0, vice_leader: 1, member: 2 };
const sortedMembersOf = (team: Team) =>
  [...team.members].sort((a, b) => ROLE_TIER[a.teamRole] - ROLE_TIER[b.teamRole] || a.position - b.position);
interface Team {
  id: string; nameAr: string; nameEn: string; descriptionAr: string | null; descriptionEn: string | null;
  icon: string | null; position: number; isPublic: boolean; kind: TeamKind; members: TeamMember[];
  // null = uncapped; otherwise the only privileges a leader/vice-leader of this team may grant.
}
interface SearchResultUser { id: string; email?: string; displayName?: string; arabicFullName?: string; photoURL?: string; role?: string }

export default function AdminTeamsPage() {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [kindTab, setKindTab] = useState<TeamKind>('specialized');
  const [newTeam, setNewTeam] = useState<{ id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; icon: string; isPublic: boolean; kind: TeamKind }>(
    { id: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true, kind: 'specialized' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<{ nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; icon: string; isPublic: boolean; kind: TeamKind }>(
    { nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true, kind: 'specialized' });
  const [memberPicker, setMemberPicker] = useState<{ teamId: string; teamRole: TeamRole } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [privilegesUserId, setPrivilegesUserId] = useState<string | null>(null);
  const isSuperAdmin = userData?.isSuperAdmin === true;

  // `silent` skips the loading-spinner toggle -- used for reloads after a mutation so the whole
  // page doesn't flash back to <AdminLoading /> every time a team/member is added, edited, etc.
  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try { setTeams(await apiGetArray<Team>('/api/admin/teams')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load teams'); }
    finally { if (!opts?.silent) setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const searchUsers = async (query: string) => {
    setSearching(true);
    try {
      const result = await httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query });
      // Any active account can be picked: a plain student is promoted to "member" by the server
      // in the same step as joining the team, so there is no separate promote-then-add round trip.
      setSearchResults(result.data.users.filter(u => !u.isRestricted));
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to search members', 'error'); }
    finally { setSearching(false); setHasSearched(true); }
  };

  // Search as you type (debounced), same pattern as the Users & Members page. Declared here,
  // before any early return below, so every render calls the same hooks in the same order.
  useEffect(() => {
    if (!memberPicker) return;
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); setHasSearched(false); return; }
    const timer = window.setTimeout(() => { void searchUsers(query); }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, memberPicker]);

  const topbarActions = useMemo(() => (
    isSuperAdmin ? (
      <button
        type="button"
        onClick={() => setCreating(value => !value)}
        className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 px-3.5 py-2 text-xs font-bold text-[var(--color-accent-contrast)] transition-opacity"
      >
        <Plus size={16} />{isAr ? 'فريق جديد' : 'New team'}
      </button>
    ) : null
  ), [isAr, isSuperAdmin]);
  useAdminTopbarActions(topbarActions);

  if (userData && userData.role === 'student') {
    return <AdminError message={isAr ? 'هذه الصفحة مخصصة لفريق العمل.' : 'This page is for staff accounts only.'} />;
  }
  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  // A viewer's own team(s) come first, so a leader/vice-leader lands on their own card without
  // scrolling; ties keep the super-admin-configured display order.
  const isMine = (team: Team) => !!userData && team.members.some(m => m.userId === userData.id);
  const sortedTeams = [...teams]
    .filter(team => team.kind === kindTab)
    .sort((a, b) => Number(isMine(b)) - Number(isMine(a)) || a.position - b.position);
  const kindCounts = { administrative: teams.filter(t => t.kind === 'administrative').length, specialized: teams.filter(t => t.kind === 'specialized').length };
  const kindOptions: { key: TeamKind; label: string }[] = [
    { key: 'administrative', label: isAr ? 'الأقسام الإدارية' : 'Administrative departments' },
    { key: 'specialized', label: isAr ? 'الأقسام التخصصية' : 'Specialized departments' },
  ];
  const kindSelect = (value: TeamKind, onChange: (kind: TeamKind) => void) => (
    <select value={value} onChange={e => onChange(e.target.value as TeamKind)}
            className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm font-bold">
      {kindOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
  );

  const createTeam = async () => {
    if (!newTeam.id || !newTeam.nameAr || !newTeam.nameEn) return;
    setBusy(true);
    try {
      await apiSend('POST', '/api/admin/teams', {
        id: newTeam.id, nameAr: newTeam.nameAr, nameEn: newTeam.nameEn, isPublic: newTeam.isPublic, kind: newTeam.kind,
        descriptionAr: newTeam.descriptionAr || null, descriptionEn: newTeam.descriptionEn || null, icon: newTeam.icon || null,
      });
      setCreating(false);
      setKindTab(newTeam.kind);
      setNewTeam({ id: '', nameAr: '', nameEn: '', descriptionAr: '', descriptionEn: '', icon: '', isPublic: true, kind: 'specialized' });
      await load({ silent: true });
      showToast(isAr ? 'تم إنشاء الفريق.' : 'Team created.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to create team', 'error'); }
    finally { setBusy(false); }
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditTeam({ nameAr: team.nameAr, nameEn: team.nameEn, descriptionAr: team.descriptionAr ?? '', descriptionEn: team.descriptionEn ?? '', icon: team.icon ?? '', isPublic: team.isPublic, kind: team.kind });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    try {
      await apiSend('PATCH', `/api/admin/teams/${encodeURIComponent(editingId)}`, {
        nameAr: editTeam.nameAr, nameEn: editTeam.nameEn, isPublic: editTeam.isPublic, kind: editTeam.kind,
        descriptionAr: editTeam.descriptionAr || null, descriptionEn: editTeam.descriptionEn || null, icon: editTeam.icon || null,
      });
      setEditingId(null);
      setKindTab(editTeam.kind);
      await load({ silent: true });
      showToast(isAr ? 'تم الحفظ.' : 'Saved.', 'success');
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save team', 'error'); }
    finally { setBusy(false); }
  };

  const deleteTeam = async (id: string) => {
    if (!window.confirm(isAr ? 'حذف هذا الفريق؟' : 'Delete this team?')) return;
    setBusy(true);
    try { await apiSend('DELETE', `/api/admin/teams/${encodeURIComponent(id)}`); await load({ silent: true }); showToast(isAr ? 'تم الحذف.' : 'Deleted.', 'success'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to delete team', 'error'); }
    finally { setBusy(false); }
  };

  const saveMembers = async (team: Team, members: TeamMember[]) => {
    setBusy(true);
    try {
      await apiSend('PUT', `/api/admin/teams/${encodeURIComponent(team.id)}/members`, {
        members: members.map(m => ({ userId: m.userId, teamRole: m.teamRole })),
      });
      await load({ silent: true });
    } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to update members', 'error'); }
    finally { setBusy(false); }
  };

  // Leader and vice-leader are singular tiers shown first; only the plain "member" tier is
  // actually reorderable, so this only ever shuffles within that subgroup.
  const moveMemberWithinTier = (team: Team, userId: string, direction: 'up' | 'down') => {
    const sorted = sortedMembersOf(team);
    const topTier = sorted.filter(m => m.teamRole !== 'member');
    const members = sorted.filter(m => m.teamRole === 'member');
    const index = members.findIndex(m => m.userId === userId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= members.length) return;
    [members[index], members[targetIndex]] = [members[targetIndex], members[index]];
    void saveMembers(team, [...topTier, ...members]);
  };

  const changeMemberRole = (team: Team, userId: string, teamRole: TeamRole) => {
    const updated = team.members.map(m => m.userId === userId ? { ...m, teamRole } : m);
    void saveMembers(team, [...updated].sort((a, b) => ROLE_TIER[a.teamRole] - ROLE_TIER[b.teamRole] || a.position - b.position));
  };

  const removeMember = (team: Team, userId: string) => {
    void saveMembers(team, team.members.filter(m => m.userId !== userId));
  };

  const addMember = (user: SearchResultUser) => {
    if (!memberPicker) return;
    const team = teams.find(t => t.id === memberPicker.teamId);
    if (!team || team.members.some(m => m.userId === user.id)) return;
    const teamRole = memberPicker.teamRole;
    setMemberPicker(null); setSearchQuery(''); setSearchResults([]);
    void (async () => {
      setBusy(true);
      try {
        const result = await apiSend<{ promoted?: boolean }>('POST', `/api/admin/teams/${encodeURIComponent(team.id)}/members`, { userId: user.id, teamRole });
        showToast(result?.promoted
          ? (isAr ? 'تمت الإضافة وترقية الحساب إلى عضو.' : 'Added to the team and promoted to Member.')
          : (isAr ? 'تمت إضافة العضو إلى الفريق.' : 'Added to the team.'), 'success');
        await load({ silent: true });
      } catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to add member', 'error'); }
      finally { setBusy(false); }
    })();
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-cairo">{isAr ? 'الفرق' : 'Teams'}</h1>
        <p className="text-gray-500 text-sm">
          {isAr
            ? 'قائد الفريق أو نائبه يمكنه إدارة صلاحيات وأوسمة أعضاء فريقه فقط، وأقصى ما يمنحه هو صلاحياته هو نفسه — فضبط صلاحيات القائد/النائب يحدد تلقائيًا الحد الأقصى لأعضاء فريقه. الفرق العلنية تظهر على صفحة "الهيكلة" في الموقع، بالترتيب الظاهر هنا.'
            : "A team's leader or vice-leader can manage privileges & badges only for their own team members, and the most they can grant is their own privileges — so setting the leader/vice-leader's privileges automatically sets the maximum for their team members. Public teams appear on the website's Structure page, in the order shown here."}
        </p>
      </div>

      {error && <AdminError message={error} />}

      <div role="tablist" aria-label={isAr ? 'نوع الأقسام' : 'Department type'}
           className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface-2)] p-1.5">
        {kindOptions.map(option => {
          const active = kindTab === option.key;
          return (
            <button key={option.key} type="button" role="tab" aria-selected={active} onClick={() => { setKindTab(option.key); setNewTeam(current => ({ ...current, kind: option.key })); }}
                    className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm sm:text-base font-black font-cairo transition-all ${
                      active ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-md' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                    }`}>
              {option.label}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-white/20' : 'bg-[var(--color-surface)]'}`}>{kindCounts[option.key]}</span>
            </button>
          );
        })}
      </div>

      {creating && (
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder={isAr ? 'المعرف (مثال: web-team)' : 'id (e.g. web-team)'} value={newTeam.id}
                   onChange={e => setNewTeam({ ...newTeam, id: e.target.value.trim().toLowerCase() })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" dir="ltr" />
            <input placeholder={isAr ? 'الاسم بالعربي' : 'Arabic name'} value={newTeam.nameAr}
                   onChange={e => setNewTeam({ ...newTeam, nameAr: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <input placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'} value={newTeam.nameEn}
                   onChange={e => setNewTeam({ ...newTeam, nameEn: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <textarea placeholder={isAr ? 'الوصف (عربي، اختياري)' : 'Description (Arabic, optional)'} value={newTeam.descriptionAr}
                      onChange={e => setNewTeam({ ...newTeam, descriptionAr: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" rows={2} />
            <textarea placeholder={isAr ? 'الوصف (إنجليزي، اختياري)' : 'Description (English, optional)'} value={newTeam.descriptionEn}
                      onChange={e => setNewTeam({ ...newTeam, descriptionEn: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {kindSelect(newTeam.kind, kind => setNewTeam({ ...newTeam, kind }))}
            <input placeholder={isAr ? 'اسم أيقونة (Lucide، اختياري)' : 'Icon name (Lucide, optional)'} value={newTeam.icon}
                   onChange={e => setNewTeam({ ...newTeam, icon: e.target.value })} className="flex-1 min-w-[10rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" dir="ltr" />
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={newTeam.isPublic} onChange={e => setNewTeam({ ...newTeam, isPublic: e.target.checked })} />
              {isAr ? 'إظهار في صفحة الهيكلة العلنية' : 'Show on public Structure page'}
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={createTeam} className="cursor-pointer rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">
              {isAr ? 'إنشاء' : 'Create'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="cursor-pointer rounded-xl bg-[var(--color-surface-2)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)]">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedTeams.map((team) => (
          <div key={team.id} className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 backdrop-blur-md p-5 shadow-xs flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--color-text-primary)] font-cairo">
                  {isAr ? team.nameAr : team.nameEn} <span className="text-[var(--color-text-muted)] text-xs font-normal">({team.members.length} {isAr ? (team.members.length === 1 ? 'عضو' : 'أعضاء') : team.members.length === 1 ? 'member' : 'members'})</span>
                  {!team.isPublic && <span className="ms-2 rounded-lg bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">{isAr ? 'داخلي' : 'internal'}</span>}
                </p>
                {(team.descriptionAr || team.descriptionEn) && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{isAr ? team.descriptionAr : team.descriptionEn}</p>}
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(team)} className="cursor-pointer rounded-lg bg-[var(--color-surface-2)] p-1.5 hover:opacity-80 text-[var(--color-text-secondary)]"><Edit2 size={14} /></button>
                  <button type="button" onClick={() => deleteTeam(team.id)} className="cursor-pointer rounded-lg p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={16} /></button>
                </div>
              )}
            </div>

            {isSuperAdmin && editingId === team.id && (
              <div className="mt-3 border-t border-[var(--color-border)]/50 pt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input value={editTeam.nameAr} onChange={e => setEditTeam({ ...editTeam, nameAr: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" placeholder="Arabic name" />
                  <input value={editTeam.nameEn} onChange={e => setEditTeam({ ...editTeam, nameEn: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" placeholder="English name" />
                  <textarea value={editTeam.descriptionAr} onChange={e => setEditTeam({ ...editTeam, descriptionAr: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" rows={2} placeholder="Description (Arabic)" />
                  <textarea value={editTeam.descriptionEn} onChange={e => setEditTeam({ ...editTeam, descriptionEn: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" rows={2} placeholder="Description (English)" />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {kindSelect(editTeam.kind, kind => setEditTeam({ ...editTeam, kind }))}
                  <input value={editTeam.icon} onChange={e => setEditTeam({ ...editTeam, icon: e.target.value })} className="flex-1 min-w-[10rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" placeholder="Icon name" dir="ltr" />
                  <label className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
                    <input type="checkbox" checked={editTeam.isPublic} onChange={e => setEditTeam({ ...editTeam, isPublic: e.target.checked })} />
                    {isAr ? 'إظهار علنيًا' : 'Public'}
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={saveEdit} className="cursor-pointer rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">{isAr ? 'حفظ' : 'Save'}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="cursor-pointer rounded-xl bg-[var(--color-surface-2)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)]">{isAr ? 'إلغاء' : 'Cancel'}</button>
                </div>
              </div>
            )}

            <div className="mt-4 flex-1 space-y-2">
              {sortedMembersOf(team).map((member) => {
                const membersOnly = sortedMembersOf(team).filter(m => m.teamRole === 'member');
                const memberIdx = membersOnly.findIndex(m => m.userId === member.userId);
                const tierStyle = member.teamRole === 'leader'
                  ? { bg: 'bg-amber-500/10', text: 'text-amber-600', Icon: Crown, label: isAr ? 'قائد' : 'Leader' }
                  : member.teamRole === 'vice_leader'
                  ? { bg: 'bg-sky-500/10', text: 'text-sky-600', Icon: ShieldCheck, label: isAr ? 'نائب قائد' : 'Vice Leader' }
                  : { bg: 'bg-[var(--color-surface-2)]', text: 'text-[var(--color-text-secondary)]', Icon: null, label: isAr ? 'عضو' : 'Member' };
                const accountLabel = (isAr ? member.roleNameAr : member.roleNameEn) || member.role;
                return (
                  <div key={member.userId} className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-2)]/60 p-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center font-black text-sm shrink-0">
                      {member.displayName.trim().charAt(0) || '?'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/users/${encodeURIComponent(member.userId)}`}
                            className="block font-bold text-[var(--color-text-primary)] text-sm truncate hover:text-[var(--color-accent)] hover:underline">{member.displayName}</Link>
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">{accountLabel}</p>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold shrink-0 ${tierStyle.bg} ${tierStyle.text}`}>
                      {tierStyle.Icon && <tierStyle.Icon size={12} />}
                      {tierStyle.label}
                    </span>

                    <span title={isAr ? 'النقاط العادية' : 'Regular points'} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-warning)] shrink-0">
                      <Star size={12} className="fill-current" />
                      {member.totalPoints ?? 0}
                    </span>
                    <span title={isAr ? 'النقاط الإدارية' : 'Administrative points'} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-accent)] shrink-0">
                      <Briefcase size={12} />
                      {member.adminPoints ?? 0}
                    </span>

                    {member.badges && member.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 basis-full">
                        {member.badges.map(badge => (
                          <span key={badge.key} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold">
                            <BadgeCheck size={11} />
                            {isAr ? badge.nameAr : badge.nameEn}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0 ms-auto">
                      {isSuperAdmin && (
                        <select
                          value={member.teamRole}
                          onChange={e => changeMemberRole(team, member.userId, e.target.value as TeamRole)}
                          className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] font-bold text-[var(--color-text-secondary)]"
                        >
                          <option value="leader">{isAr ? 'قائد' : 'Leader'}</option>
                          <option value="vice_leader">{isAr ? 'نائب قائد' : 'Vice Leader'}</option>
                          <option value="member">{isAr ? 'عضو' : 'Member'}</option>
                        </select>
                      )}
                      {isSuperAdmin && member.teamRole === 'member' && (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button type="button" disabled={memberIdx === 0} onClick={() => moveMemberWithinTier(team, member.userId, 'up')} className="cursor-pointer p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] disabled:opacity-20"><ArrowUp size={12} /></button>
                          <button type="button" disabled={memberIdx === membersOnly.length - 1} onClick={() => moveMemberWithinTier(team, member.userId, 'down')} className="cursor-pointer p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] disabled:opacity-20"><ArrowDown size={12} /></button>
                        </div>
                      )}
                      <button type="button" onClick={() => setPrivilegesUserId(member.userId)} title={isAr ? 'الصلاحيات والأوسمة' : 'Privileges & badges'} className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-accent)] shrink-0"><KeyRound size={16} /></button>
                      {isSuperAdmin && (
                        <button type="button" onClick={() => removeMember(team, member.userId)} className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-danger)] shrink-0"><UserMinus size={16} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
              {team.members.length === 0 && <p className="text-sm text-[var(--color-text-muted)] py-2">{isAr ? 'لا يوجد أعضاء بعد.' : 'No members yet.'}</p>}
            </div>

            {isSuperAdmin && (
              <div className="mt-3 flex gap-2">
                <select onChange={e => {
                          if (e.target.value) {
                            setSearchQuery(''); setSearchResults([]); setHasSearched(false);
                            setMemberPicker({ teamId: team.id, teamRole: e.target.value as TeamRole });
                          }
                          e.target.value = '';
                        }}
                        defaultValue="" className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:opacity-80">
                  <option value="" disabled>{isAr ? '+ إضافة عضو كـ…' : '+ Add member as…'}</option>
                  <option value="member">{isAr ? 'عضو' : 'Member'}</option>
                  <option value="vice_leader">{isAr ? 'نائب قائد' : 'Vice Leader'}</option>
                  <option value="leader">{isAr ? 'قائد' : 'Leader'}</option>
                </select>
              </div>
            )}
          </div>
        ))}
        {sortedTeams.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            {isAr ? 'لا توجد أقسام في هذا النوع بعد. غيّر نوع أي قسم من زر التعديل لنقله إلى هنا.' : 'No departments of this type yet. Change a department’s type from its edit button to move it here.'}
          </p>
        )}
      </div>

      {memberPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMemberPicker(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold font-cairo">{isAr ? 'إضافة عضو للفريق' : 'Add team member'}</h2>
              <button type="button" onClick={() => setMemberPicker(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {isAr
                ? 'ابحث بالاسم أو البريد أو الرقم الجامعي واختر الحساب. إذا كان طالبًا يتحول حسابه إلى «عضو» تلقائيًا عند إضافته.'
                : 'Search by name, email, or university id and pick the account. A student is automatically turned into a Member when added.'}
            </p>
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
                    {u.role === 'student' && (
                      <div className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {isAr ? 'طالب — سيصبح عضوًا' : 'Student — will become a Member'}
                      </div>
                    )}
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


      {privilegesUserId && <PrivilegesBadgesPanel userId={privilegesUserId} onClose={() => setPrivilegesUserId(null)} />}
    </div>
  );
}

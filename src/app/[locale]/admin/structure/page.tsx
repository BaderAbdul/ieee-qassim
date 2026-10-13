'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Plus, Trash2, Edit2, Save, X, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { httpsCallable } from '@/lib/backend';
import type { MemberSearchResult } from '@/lib/adminTypes';

interface CommitteeMember {
  userId: string;
  name: string;
  role: string;
  englishRole?: string;
  englishName?: string;
  avatar?: string;
  linkedin?: string;
}

interface Committee {
  id: string;
  name: string;
  englishName?: string;
  description: string;
  iconName: string;
  members: CommitteeMember[];
}

export default function AdminStructurePage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const structureRevision = useRef(0);
  const busy = useRef(false);
  
  // Modal states
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [currentCommittee, setCurrentCommittee] = useState<Committee | null>(null);
  
  const [showMemberModal, setShowMemberModal] = useState<{ committeeId: string } | null>(null);
  const [memberRole, setMemberRole] = useState('عضو');
  const [memberEnglishRole, setMemberEnglishRole] = useState('Member');
  const [memberEnglishName, setMemberEnglishName] = useState('');
  const [memberLinkedin, setMemberLinkedin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  interface SearchResultUser {
    id: string;
    email?: string;
    displayName?: string;
    arabicFullName?: string;
    photoURL?: string;
  }

  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true); setError('');
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'homepage'));
        if (!active) return;
        structureRevision.current = Number(docSnap.data()?.structureRevision || 0);
        if (docSnap.exists() && docSnap.data().committees) {
          setCommittees(docSnap.data().committees);
        } else {
          setCommittees([]);
        }
      } catch (e) {
        console.error(e);
        if (active) setError('تعذر تحميل الهيكلة. أعد المحاولة.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [revision]);

  const updateCommitteesInDB = async (newCommittees: Committee[]) => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError(''); setMessage('');
    try {
      // Firestore does not accept 'undefined' values. We must deep clone and remove undefined keys.
      const cleanCommittees = JSON.parse(JSON.stringify(newCommittees));
      const result = await httpsCallable<unknown, { structureRevision: number }>(null, 'saveHomepage')({ committees: cleanCommittees, expectedStructureRevision: structureRevision.current });
      structureRevision.current = result.data.structureRevision;
      setCommittees(cleanCommittees);
      setMessage('تم حفظ الهيكلة بنجاح.');
      return true;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'حدث خطأ أثناء حفظ الهيكلة. لم تتغير البيانات المحفوظة.');
      return false;
    } finally {
      setSaving(false);
      busy.current = false;
    }
  };

  const handleSave = async () => {
    await updateCommitteesInDB(committees);
  };

  const handleAddCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommittee) return;
    
    let updated;
    if (currentCommittee.id) {
      updated = committees.map(c => c.id === currentCommittee.id ? currentCommittee : c);
    } else {
      updated = [...committees, { ...currentCommittee, id: crypto.randomUUID(), members: [] }];
    }
    if (await updateCommitteesInDB(updated)) setShowCommitteeModal(false);
  };

  const handleDeleteCommittee = async (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذه اللجنة؟')) {
      const updated = committees.filter(c => c.id !== id);
      await updateCommitteesInDB(updated);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const result = await httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query: searchQuery.trim() });
      setSearchResults(result.data.users);
      if (result.data.truncated) setMessage('نتائج البحث محدودة؛ اكتب بداية اسم أو بريد أدق أو رقمًا جامعيًا مطابقًا.');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'تعذر البحث في الأعضاء.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (user: SearchResultUser) => {
    if (!showMemberModal) return;
    const { committeeId } = showMemberModal;
    
    const updated = committees.map(c => {
      if (c.id === committeeId) {
        const memberExists = c.members.some(m => m.userId === user.id);
        if (memberExists) return c;
        return {
          ...c,
          members: [...c.members, {
            userId: user.id,
            name: user.arabicFullName || user.displayName || 'بدون اسم',
            englishName: memberEnglishName || user.displayName || undefined,
            role: memberRole,
            englishRole: memberEnglishRole || undefined,
            linkedin: memberLinkedin || undefined,
            avatar: user.photoURL
          }]
        };
      }
      return c;
    });
    
    if (!await updateCommitteesInDB(updated)) return;
    
    setShowMemberModal(null);
    setSearchQuery('');
    setSearchResults([]);
    setMemberLinkedin('');
    setMemberRole('عضو');
    setMemberEnglishRole('Member');
    setMemberEnglishName('');
  };

  const handleRemoveMember = async (committeeId: string, userId: string) => {
    if(confirm('هل أنت متأكد من إزالة هذا العضو؟')) {
      const updated = committees.map(c => {
        if (c.id === committeeId) {
          return { ...c, members: c.members.filter(m => m.userId !== userId) };
        }
        return c;
      });
      await updateCommitteesInDB(updated);
    }
  };
  const moveMember = async (committeeId: string, memberIndex: number, direction: 'up' | 'down') => {
    const updated = committees.map(c => {
      if (c.id !== committeeId) return c;
      const members = [...c.members];
      if (direction === 'up' && memberIndex === 0) return c;
      if (direction === 'down' && memberIndex === members.length - 1) return c;
      const targetIndex = direction === 'up' ? memberIndex - 1 : memberIndex + 1;
      [members[memberIndex], members[targetIndex]] = [members[targetIndex], members[memberIndex]];
      return { ...c, members };
    });
    await updateCommitteesInDB(updated);
  };

  const moveCommittee = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === committees.length - 1)
    ) return;
    
    const updated = [...committees];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    
    await updateCommitteesInDB(updated);
  };


  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}<button type="button" disabled={saving} onClick={() => setRevision(value => value + 1)} className="ms-3 underline">إعادة تحميل المحفوظ</button></div>}
      {message && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{message}</p>}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-cairo">هيكلة النادي والتنظيم</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setCurrentCommittee({ id: '', name: '', englishName: '', description: '', iconName: 'Users', members: [] });
              setShowCommitteeModal(true);
            }}
            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-200 transition-colors"
          >
            <Plus size={18} />
            إضافة لجنة/مسار
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
            حفظ الهيكلة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {committees.map((committee, index) => (
          <div key={committee.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold font-cairo text-gray-900">{committee.name}</h3>
                {committee.englishName && <p className="text-xs text-gray-500 font-mono mt-0.5">{committee.englishName}</p>}
                <p className="text-sm text-gray-500 mt-1">{committee.description}</p>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => moveCommittee(index, 'up')} disabled={index === 0} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg disabled:opacity-30"><ArrowUp size={16} /></button>
                <button onClick={() => moveCommittee(index, 'down')} disabled={index === committees.length - 1} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg disabled:opacity-30"><ArrowDown size={16} /></button>
                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                <button onClick={() => { setCurrentCommittee(committee); setShowCommitteeModal(true); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleDeleteCommittee(committee.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="flex-1 mt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-700">الأعضاء ({committee.members.length})</h4>
                <button 
                  onClick={() => setShowMemberModal({ committeeId: committee.id })}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                >
                  + إضافة عضو
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {committee.members.map((member, memberIdx) => (
                  <div key={member.userId || memberIdx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveMember(committee.id, memberIdx, 'up')}
                          disabled={memberIdx === 0}
                          title="تحريك لأعلى"
                          aria-label="تحريك العضو لأعلى"
                          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20 hover:bg-white rounded transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMember(committee.id, memberIdx, 'down')}
                          disabled={memberIdx === committee.members.length - 1}
                          title="تحريك لأسفل"
                          aria-label="تحريك العضو لأسفل"
                          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-20 hover:bg-white rounded transition-colors"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {member.avatar ? <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" /> : member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{member.name} {member.englishName ? `(${member.englishName})` : ''}</div>
                        <div className="text-xs text-gray-500 truncate">{member.role} {member.englishRole ? `- ${member.englishRole}` : ''}</div>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(committee.id, member.userId)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors" title="إزالة العضو"><X size={14} /></button>
                  </div>
                ))}
                {committee.members.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-4">لا يوجد أعضاء في هذه اللجنة</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Committee Modal */}
      {showCommitteeModal && currentCommittee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 font-cairo">{currentCommittee.id ? 'تعديل اللجنة' : 'لجنة جديدة'}</h2>
            <form onSubmit={handleAddCommittee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم اللجنة/المسار</label>
                <input required type="text" value={currentCommittee.name} onChange={e => setCurrentCommittee({...currentCommittee, name: e.target.value})} className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الاسم بالانجليزي (English Name)</label>
                <input type="text" value={currentCommittee.englishName || ''} onChange={e => setCurrentCommittee({...currentCommittee, englishName: e.target.value})} className="w-full border rounded-lg p-2 text-left" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea required value={currentCommittee.description} onChange={e => setCurrentCommittee({...currentCommittee, description: e.target.value})} className="w-full border rounded-lg p-2 h-20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اسم الأيقونة (من Lucide)</label>
                <input type="text" value={currentCommittee.iconName || 'Users'} onChange={e => setCurrentCommittee({...currentCommittee, iconName: e.target.value})} className="w-full border rounded-lg p-2" placeholder="Users, Code, Megaphone..." />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCommitteeModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">إلغاء</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg font-bold">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-cairo">إضافة عضو للجنة</h2>
              <button onClick={() => setShowMemberModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم بالإنجليزي (English Name)</label>
                <input type="text" value={memberEnglishName} onChange={e => setMemberEnglishName(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Ex: Bader" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">يترك فارغاً لاستخدام اسم الحساب الافتراضي</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">صفة العضو (عربي)</label>
                  <input type="text" value={memberRole} onChange={e => setMemberRole(e.target.value)} className="w-full border rounded-lg p-2" placeholder="مثال: رئيس اللجنة..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">صفة العضو (English)</label>
                  <input type="text" value={memberEnglishRole} onChange={e => setMemberEnglishRole(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Ex: Chair..." dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رابط لينكد إن (اختياري)</label>
                <input type="url" value={memberLinkedin} onChange={e => setMemberLinkedin(e.target.value)} className="w-full border rounded-lg p-2 text-left" placeholder="https://linkedin.com/in/..." dir="ltr" />
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                className="flex-1 border rounded-lg p-2" 
                placeholder="ابحث بالاسم أو البريد..." 
              />
              <button type="button" onClick={searchUsers} disabled={searching} className="bg-purple-100 text-purple-700 px-4 rounded-lg">
                {searching ? <div className="animate-spin h-4 w-4 border-2 border-purple-700 border-t-transparent rounded-full" /> : <Search size={18} />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{u.arabicFullName || u.displayName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                  <button 
                    onClick={() => handleAddMember(u)}
                    className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                  >
                    إضافة
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && !searching && searchQuery && (
                <div className="text-center text-gray-500 py-8 text-sm">لا توجد نتائج مطابقة</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

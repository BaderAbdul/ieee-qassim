'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Plus, Trash2, Edit2, Save, X, Search } from 'lucide-react';

interface CommitteeMember {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
}

interface Committee {
  id: string;
  name: string;
  description: string;
  iconName: string;
  members: CommitteeMember[];
}

export default function AdminStructurePage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [currentCommittee, setCurrentCommittee] = useState<Committee | null>(null);
  
  const [showMemberModal, setShowMemberModal] = useState<{ committeeId: string } | null>(null);
  const [memberRole, setMemberRole] = useState('عضو');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'homepage'));
        if (docSnap.exists() && docSnap.data().committees) {
          setCommittees(docSnap.data().committees);
        } else {
          setCommittees([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'homepage'), { committees }, { merge: true });
      alert('تم حفظ الهيكلة بنجاح');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommittee) return;
    
    if (currentCommittee.id) {
      setCommittees(committees.map(c => c.id === currentCommittee.id ? currentCommittee : c));
    } else {
      setCommittees([...committees, { ...currentCommittee, id: Date.now().toString(), members: [] }]);
    }
    setShowCommitteeModal(false);
  };

  const handleDeleteCommittee = (id: string) => {
    if(confirm('هل أنت متأكد من حذف هذه اللجنة؟')) {
      setCommittees(committees.filter(c => c.id !== id));
    }
  };

  const searchUsers = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const q = query(collection(db, 'users'), limit(50));
      const snap = await getDocs(q);
      const res = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => 
          (u.arabicFullName && u.arabicFullName.includes(searchQuery)) || 
          (u.email && u.email.includes(searchQuery)) || 
          (u.displayName && u.displayName.includes(searchQuery))
        );
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = (user: any) => {
    if (!showMemberModal) return;
    const { committeeId } = showMemberModal;
    
    setCommittees(committees.map(c => {
      if (c.id === committeeId) {
        const memberExists = c.members.some(m => m.userId === user.id);
        if (memberExists) return c;
        return {
          ...c,
          members: [...c.members, {
            userId: user.id,
            name: user.arabicFullName || user.displayName || 'بدون اسم',
            role: memberRole,
            avatar: user.photoURL
          }]
        };
      }
      return c;
    }));
    
    setShowMemberModal(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveMember = (committeeId: string, userId: string) => {
    setCommittees(committees.map(c => {
      if (c.id === committeeId) {
        return { ...c, members: c.members.filter(m => m.userId !== userId) };
      }
      return c;
    }));
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-cairo">هيكلة النادي والتنظيم</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setCurrentCommittee({ id: '', name: '', description: '', iconName: 'Users', members: [] });
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
        {committees.map(committee => (
          <div key={committee.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold font-cairo text-gray-900">{committee.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{committee.description}</p>
              </div>
              <div className="flex gap-2">
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
                {committee.members.map(member => (
                  <div key={member.userId} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold overflow-hidden">
                        {member.avatar ? <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" /> : member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.role}</div>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(committee.id, member.userId)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
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
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea required value={currentCommittee.description} onChange={e => setCurrentCommittee({...currentCommittee, description: e.target.value})} className="w-full border rounded-lg p-2 h-20" />
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
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">صفة العضو (المنصب)</label>
              <input type="text" value={memberRole} onChange={e => setMemberRole(e.target.value)} className="w-full border rounded-lg p-2" placeholder="مثال: رئيس اللجنة، نائب، عضو..." />
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

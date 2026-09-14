'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/context/AuthContext';
import { Search, Trophy, Shield, ShieldAlert } from 'lucide-react';

export default function AdminUsersPage() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Adjust Points Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching users', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [userData]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || typeof amount !== 'number' || amount === 0 || !reason.trim()) {
      setError('Please provide a valid non-zero amount and a reason.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const addManualPoints = httpsCallable(functions, 'addManualPoints');
      await addManualPoints({
        studentUid: selectedUser.id,
        amount,
        reason: reason.trim()
      });
      
      // Update local state to reflect change (cache update simulation)
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, totalPoints: (u.totalPoints || 0) + amount } 
          : u
      ));
      
      setIsModalOpen(false);
      setAmount('');
      setReason('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  if (!userData || (userData.role !== 'super_admin' && userData.role !== 'event_organizer')) {
    return <div className="text-center py-20 text-red-600">Access Denied. Event Organizers or Super Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-cairo">إدارة المستخدمين</h1>
          <p className="text-gray-500">البحث وتعديل نقاط الطلاب</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 rtl:-scale-x-100" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو البريد الإلكتروني..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium">المستخدم</th>
                <th className="py-4 px-6 font-medium">البريد الجامعي</th>
                <th className="py-4 px-6 font-medium">الدور</th>
                <th className="py-4 px-6 font-medium">النقاط</th>
                <th className="py-4 px-6 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-gray-900">{u.displayName}</div>
                  </td>
                  <td className="py-4 px-6 text-gray-500">{u.email}</td>
                  <td className="py-4 px-6">
                    {u.role === 'super_admin' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700"><ShieldAlert className="h-3 w-3 me-1"/> مدير عام</span>
                    ) : u.role === 'event_organizer' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700"><Shield className="h-3 w-3 me-1"/> منظم فعاليات</span>
                    ) : (
                      <span className="text-gray-500 text-sm">طالب</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center text-green-600 font-bold">
                      <Trophy className="h-4 w-4 me-1" />
                      {u.totalPoints || 0}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                      className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg text-sm font-bold transition-colors"
                    >
                      تعديل النقاط
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">لا يوجد مستخدمين.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold font-cairo">تعديل نقاط الطالب</h3>
              <p className="text-gray-500 text-sm mt-1">{selectedUser.displayName} ({selectedUser.email})</p>
            </div>
            
            <form onSubmit={handleAdjustPoints} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">النقاط (يمكن أن تكون سالبة لخصم النقاط)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="مثال: 50 أو -10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                    dir="ltr"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">السبب (إلزامي للتوثيق)</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="سبب التعديل (مثال: الفوز في مسابقة الهاكاثون)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
                  rows={3}
                  required
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-white bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'تأكيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

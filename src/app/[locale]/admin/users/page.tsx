'use client';

import { useEffect, useRef, useState } from 'react';
import { functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { Search, Trophy, Shield, ShieldAlert, Trash2, Edit3, Lock, Unlock } from 'lucide-react';
import type { MemberSearchResult } from '@/lib/adminTypes';
import { AdminError } from '@/components/admin/AdminData';

interface AdminUserItem {
  id: string;
  displayName?: string;
  arabicFullName?: string;
  email?: string;
  role?: string;
  totalPoints?: number;
  isRestricted?: boolean;
}

export default function AdminUsersPage() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [revision, setRevision] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const pointOperation = useRef<{ key: string; id: string } | null>(null);
  
  // Adjust Points Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = userData?.role;
  useEffect(() => {
    if (role !== 'super_admin' && role !== 'event_organizer') {
      return;
    }

    let active = true;

    const fetchUsers = async () => {
      setLoading(true); setLoadError(null);
      try {
        const result = await httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query: searchTerm.trim(), ...(pageCursor ? { cursor: pageCursor } : {}) });
        if (active) {
          const page = result.data.users;
          setUsers(previous => pageCursor ? [...previous.filter(item => !page.some(next => next.id === item.id)), ...page] : page);
          setNextCursor(result.data.nextCursor);
          setHasMore(!!result.data.nextCursor);
          setTruncated(!!result.data.truncated);
        }
      } catch (err) {
        console.error('Error fetching users', err);
        if (active) setLoadError(err instanceof Error ? err : new Error('Unable to load users'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timer = window.setTimeout(() => { void fetchUsers(); }, searchTerm.trim() ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [role, pageCursor, searchTerm, revision]);

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
      const key = JSON.stringify([selectedUser.id, amount, reason.trim()]);
      if (pointOperation.current?.key !== key) pointOperation.current = { key, id: crypto.randomUUID() };
      const response = await addManualPoints({
        studentUid: selectedUser.id,
        amount,
        reason: reason.trim(),
        operationId: pointOperation.current.id,
      });
      const result = response.data as { totalPoints: number };
      
      // Update local state to reflect change (cache update simulation)
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, totalPoints: result.totalPoints }
          : u
      ));
      
      setIsModalOpen(false);
      setAmount('');
      setReason('');
      pointOperation.current = null;
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userData?.role !== 'super_admin') return alert('غير مصرح لك بتغيير الصلاحيات');
    if (!confirm('هل أنت متأكد من تغيير صلاحية هذا المستخدم؟')) return;
    try {
      await httpsCallable(functions, 'manageUser')({ userId, change: 'role', role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تغيير الصلاحية.');
    }
  };

  const handleToggleRestrict = async (userId: string, currentRestricted: boolean) => {
    if (userData?.role !== 'super_admin') return alert('غير مصرح لك بتقييد الحسابات');
    const actionStr = currentRestricted ? 'فك التقييد عن' : 'تقييد';
    if (!confirm(`هل أنت متأكد من ${actionStr} هذا المستخدم؟`)) return;
    try {
      await httpsCallable(functions, 'manageUser')({ userId, change: 'restriction', isRestricted: !currentRestricted });
      setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: !currentRestricted } : u));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل حالة التقييد.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userData?.role !== 'super_admin') return alert('غير مصرح لك بحذف الحسابات');
    if (!confirm('أرشفة هذا الحساب ومنعه من استخدام المنصة؟ ستُحفظ سجلاته السابقة ويمكن فك التقييد لاحقًا.')) return;
    try {
      await httpsCallable(functions, 'manageUser')({ userId, change: 'delete' });
      setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true } : u));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء أرشفة الحساب.');
    }
  };

  const filteredUsers = users;

  const isAuthorized = userData && (userData.role === 'super_admin' || userData.role === 'event_organizer');

  if (authLoading || (isAuthorized && loading && !users.length && !searchTerm)) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  if (!isAuthorized) {
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

      {loadError && <AdminError message={loadError.message} retry={() => setRevision(value => value + 1)} />}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="بداية الاسم أو البريد، أو الرقم الجامعي/معرف الحساب…"
              aria-label="البحث في الأعضاء"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPageCursor(null); setUsers([]); }}
              className="w-full ps-4 pe-10 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500" role="status">{loading ? 'جارٍ البحث…' : truncated ? 'نتائج محدودة؛ اكتب عبارة أدق. البحث من بداية الاسم أو البريد، أو رقم جامعي/معرف مطابق.' : 'البحث من بداية الاسم أو البريد، أو رقم جامعي/معرف مطابق.'}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start">
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
                    <div className="font-bold text-gray-900">{u.arabicFullName || u.displayName}</div>
                  </td>
                  <td className="py-4 px-6 text-gray-500">{u.email}</td>
                  <td className="py-4 px-6">
                    {userData?.role === 'super_admin' ? (
                      <select
                        value={u.role || 'student'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="student">طالب</option>
                        <option value="event_organizer">منظم فعاليات</option>
                        <option value="super_admin">مدير عام</option>
                      </select>
                    ) : (
                      u.role === 'super_admin' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700"><ShieldAlert className="h-3 w-3 me-1"/> مدير عام</span>
                      ) : u.role === 'event_organizer' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700"><Shield className="h-3 w-3 me-1"/> منظم فعاليات</span>
                      ) : (
                        <span className="text-gray-500 text-sm">طالب</span>
                      )
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center text-green-600 font-bold">
                      <Trophy className="h-4 w-4 me-1" />
                      {u.totalPoints || 0}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                        className="text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"
                        title="تعديل النقاط"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      {userData?.role === 'super_admin' && (
                        <>
                          <button
                            onClick={() => handleToggleRestrict(u.id, !!u.isRestricted)}
                            className={`${u.isRestricted ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:bg-gray-100'} p-2 rounded-lg transition-colors`}
                            title={u.isRestricted ? 'فك التقييد' : 'تقييد الحساب'}
                          >
                            {u.isRestricted ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="حذف الحساب"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
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
              <p className="text-gray-500 text-sm mt-1">{selectedUser.arabicFullName || selectedUser.displayName} ({selectedUser.email})</p>
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
      {hasMore && <button disabled={loading} onClick={() => { setLoading(true); setPageCursor(nextCursor); }} className="mt-6 rounded-xl bg-slate-100 px-5 py-3 font-bold disabled:opacity-50">تحميل المزيد / Load more</button>}

    </div>
  );
}

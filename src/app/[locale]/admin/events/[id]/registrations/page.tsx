'use client';

import { useEffect, useState, use } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ArrowRight, Download, Users, Check, X, Clock, UserCheck, CheckSquare, Square, Trophy, Link as LinkIcon, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RegistrationData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  universityId?: string;
  status: string;
  timestamp: { toDate?: () => Date } | Date | null;
}

const toDate = (val: { toDate?: () => Date } | Date | null | undefined): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return null;
};

export default function RegistrationDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // Points Awarding Modal State
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState<number>(5);
  const [pointsDesc, setPointsDesc] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);



  useEffect(() => {
    let active = true;

    const fetchRegistrations = async () => {
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists() && active) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }

        const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
        const snap = await getDocs(q);
        
        // Parallelize user fetching using Promise.all & cache to eliminate N+1 sequential waterfall
        const userIdsToFetch = new Set<string>();
        snap.docs.forEach(d => {
          const data = d.data();
          if (!data.userName && data.userId) {
            userIdsToFetch.add(data.userId);
          }
        });

        const userCache = new Map<string, Record<string, unknown>>();
        if (userIdsToFetch.size > 0) {
          const userSnaps = await Promise.all(
            Array.from(userIdsToFetch).map(uid => getDoc(doc(db, 'users', uid)))
          );
          userSnaps.forEach(uSnap => {
            if (uSnap.exists()) {
              userCache.set(uSnap.id, uSnap.data() as Record<string, unknown>);
            }
          });
        }

        const regs: RegistrationData[] = snap.docs.map(regDoc => {
          const regData = regDoc.data();
          const cachedUser = userCache.get(regData.userId);
          const cachedName = (cachedUser?.arabicFullName as string | undefined) || (cachedUser?.displayName as string | undefined);
          const cachedEmail = cachedUser?.email as string | undefined;
          return {
            id: regDoc.id,
            userId: regData.userId,
            userName: regData.userName || cachedName || 'Unknown',
            userEmail: regData.userEmail || cachedEmail || 'Unknown',
            status: regData.status,
            timestamp: regData.timestamp
          };
        });
        
        regs.sort((a, b) => {
          const tA = (a.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
          const tB = (b.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
          return tA - tB; // Earliest first
        });
        
        if (active) setRegistrations(regs);
      } catch (error) {
        console.error("Error fetching registrations", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRegistrations();

    return () => {
      active = false;
    };
  }, [eventId]);

  const handleUpdateStatus = async (regId: string, newStatus: string) => {
    try {
      const reg = registrations.find(r => r.id === regId);
      const userId = reg?.userId || (regId.includes('_') ? regId.slice(eventId.length + 1) : null);

      const promises: Promise<unknown>[] = [
        updateDoc(doc(db, 'registrations', regId), {
          status: newStatus
        })
      ];

      if (newStatus === 'attended' && userId) {
        promises.push(
          setDoc(doc(db, 'attendance_logs', `${eventId}_${userId}`), {
            eventId,
            userId,
            timestamp: serverTimestamp()
          }, { merge: true })
        );
      }

      await Promise.all(promises);
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error("Error updating status", error);
      alert("حدث خطأ أثناء تحديث حالة التسجيل");
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من تغيير حالة ${selectedIds.length} مسجل إلى "${newStatus}"؟`)) return;
    
    setIsUpdatingBulk(true);
    try {
      const promises = selectedIds.flatMap(id => {
        const updatePromise = updateDoc(doc(db, 'registrations', id), { status: newStatus });
        if (newStatus === 'attended') {
          const reg = registrations.find(r => r.id === id);
          const userId = reg?.userId || (id.includes('_') ? id.slice(eventId.length + 1) : null);
          if (userId) {
            const logPromise = setDoc(doc(db, 'attendance_logs', `${eventId}_${userId}`), {
              eventId,
              userId,
              timestamp: serverTimestamp()
            }, { merge: true });
            return [updatePromise, logPromise];
          }
        }
        return [updatePromise];
      });
      await Promise.all(promises);
      setRegistrations(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, status: newStatus } : r));
      setSelectedIds([]);
    } catch (error) {
      console.error("Error updating bulk status", error);
      alert("حدث خطأ أثناء تحديث الحالات");
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !pointsAmount) return;
    
    setIsAwarding(true);
    try {
      const promises = selectedIds.map(async (id) => {
        const reg = registrations.find(r => r.id === id);
        if (!reg) return;
        const userId = reg.userId || (id.includes('_') ? id.slice(eventId.length + 1) : null);
        if (!userId) return;

        // 1. Update user totalPoints
        const userRef = doc(db, 'users', userId);
        const updatePromise = updateDoc(userRef, {
          totalPoints: increment(pointsAmount)
        });

        // 2. Add transaction record
        const transPromise = addDoc(collection(db, 'point_transactions'), {
          userId,
          eventId,
          points: pointsAmount,
          amount: pointsAmount,
          description: pointsDesc || 'مشاركة في الفعالية',
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          type: 'event_attendance'
        });

        return Promise.all([updatePromise, transPromise]);
      });

      await Promise.all(promises);
      alert(`تم رصد ${pointsAmount} نقاط لـ ${selectedIds.length} مستخدم بنجاح!`);
      setShowPointsModal(false);
      setSelectedIds([]);
      setPointsDesc('');
    } catch (error) {
      console.error("Error awarding points:", error);
      alert("حدث خطأ أثناء رصد النقاط");
    } finally {
      setIsAwarding(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === registrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registrations.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const exportCSV = () => {
    if (!event) return;
    
    const headers = ['Name', 'Email', 'University ID', 'Status', 'Date'];
    const rows = registrations.map(r => {
      const d = toDate(r.timestamp);
      return [
        `"${r.userName}"`,
        `"${r.userEmail}"`,
        `"${r.universityId || ''}"`,
        r.status,
        d ? format(d, 'yyyy-MM-dd HH:mm:ss') : ''
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registrations_${event.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-gray-500">الفعالية غير موجودة.</div>;
  }

  const approvedCount = registrations.filter(r => r.status === 'approved').length;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <Link href="/admin/events" className="text-gray-500 hover:text-gray-900 me-2">
              <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 font-cairo">مكتب التسجيل</h1>
          </div>
          <p className="text-gray-600 text-lg">{event.title}</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm">
            <Download size={18} className="me-2" />
            تصدير (CSV)
          </button>
        </div>
      </div>

      {/* Check-in Desk Link Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 mb-6 shadow-sm text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 font-cairo">
            <QrCode size={24} className="text-blue-300" />
            مكتب التحضير (Check-in Desk)
          </h3>
          <p className="text-blue-100 text-sm max-w-lg">
            قم بالانتقال إلى مكتب التحضير لفتح شاشة الـ QR للطلاب، أو استخدام كاميرا الجهاز لمسح بطاقاتهم الجامعية/الرقمية للتحضير السريع والآمن.
          </p>
        </div>
        <Link 
          href={`/admin/events/${eventId}/checkin-desk`}
          className="shrink-0 bg-white text-blue-900 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold transition-colors flex items-center shadow-lg"
        >
          فتح مكتب التحضير
          <ArrowRight className="w-5 h-5 ms-2 rtl:-scale-x-100" />
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-blue-800 font-bold">
            تم تحديد {selectedIds.length} مسجل
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setShowPointsModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
            >
              <Trophy size={16} /> رصد نقاط
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('approved')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Check size={16} /> قبول
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('waitlisted')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Clock size={16} /> انتظار
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('rejected')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <X size={16} /> رفض
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('attended')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <UserCheck size={16} /> تحضير (حضور)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center me-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">إجمالي المسجلين</p>
            <h3 className="text-2xl font-bold text-gray-900">{registrations.length}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center me-4">
            <Check size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">المقبولين (سعة {event.capacity})</p>
            <h3 className="text-2xl font-bold text-gray-900">{approvedCount}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center me-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">قائمة الانتظار / معلق</p>
            <h3 className="text-2xl font-bold text-gray-900">{registrations.filter(r => r.status === 'waitlisted' || r.status === 'pending').length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {registrations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا يوجد مسجلين حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-start">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600 transition-colors">
                      {selectedIds.length === registrations.length && registrations.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الطالب</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">تاريخ التسجيل</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className={`hover:bg-gray-50 ${selectedIds.includes(reg.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(reg.id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        {selectedIds.includes(reg.id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{reg.userName}</div>
                      <div className="text-sm text-gray-500">{reg.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {toDate(reg.timestamp) ? format(toDate(reg.timestamp)!, 'dd MMM yyyy HH:mm', { locale: ar }) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                        reg.status === 'attended' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        reg.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                        reg.status === 'rejected' || reg.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {reg.status === 'attended' ? 'attended (حاضر)' : reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-start text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {reg.status !== 'approved' && reg.status !== 'attended' && (
                          <button onClick={() => handleUpdateStatus(reg.id, 'approved')} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="قبول">
                            <Check size={18} />
                          </button>
                        )}
                        {reg.status !== 'attended' && (
                          <button onClick={() => handleUpdateStatus(reg.id, 'attended')} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="تحضير (حضر الفعالية)">
                            <UserCheck size={18} />
                          </button>
                        )}
                        {reg.status !== 'waitlisted' && (
                          <button onClick={() => handleUpdateStatus(reg.id, 'waitlisted')} className="text-yellow-600 hover:bg-yellow-50 p-1.5 rounded" title="وضع في قائمة الانتظار">
                            <Clock size={18} />
                          </button>
                        )}
                        {reg.status !== 'rejected' && reg.status !== 'cancelled' && (
                          <button onClick={() => handleUpdateStatus(reg.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="رفض">
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold font-cairo flex items-center gap-2">
                <Trophy size={20} />
                رصد نقاط للمسجلين ({selectedIds.length})
              </h3>
              <button onClick={() => setShowPointsModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAwardPoints} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">عدد النقاط</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={pointsAmount}
                  onChange={e => setPointsAmount(Number(e.target.value))}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">الوصف (يظهر للمستخدم)</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: حضور الفعالية وتفاعل مميز"
                  value={pointsDesc}
                  onChange={e => setPointsDesc(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={isAwarding}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {isAwarding ? 'جاري الرصد...' : 'رصد النقاط الآن'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowPointsModal(false)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

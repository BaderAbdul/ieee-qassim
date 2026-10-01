'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { PlatformEvent, EventState } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Plus, Users, QrCode, Award, Eye, Edit2, Star, Pin } from 'lucide-react';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      // In production, we'd paginate. For now, fetch all events sorted by date.
      const q = query(collection(db, 'events'));
      const snap = await getDocs(q);
      const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlatformEvent[];
      
      // Sort client-side
      fetchedEvents.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
        const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      try {
        const q = query(collection(db, 'events'));
        const snap = await getDocs(q);
        if (!active) return;
        const fetchedEvents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PlatformEvent[];
        
        fetchedEvents.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
          const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as { toDate?: () => Date })?.toDate?.() || new Date();
          return dateB.getTime() - dateA.getTime();
        });
        
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const handleTogglePin = async (eventId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        isPinned: !currentPinned,
        updatedAt: new Date()
      });
      fetchEvents();
    } catch (error) {
      console.error("Error toggling pin state", error);
      alert("حدث خطأ أثناء تعديل تثبيت الفعالية");
    }
  };

  const handleStateChange = async (eventId: string, newState: EventState) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        state: newState,
        updatedAt: new Date()
      });
      // Refresh list
      fetchEvents();
    } catch (error) {
      console.error("Error updating event state", error);
      alert("حدث خطأ أثناء تحديث حالة الفعالية");
    }
  };

  const getStatusColor = (state: EventState) => {
    switch (state) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Published': return 'bg-blue-100 text-blue-700';
      case 'Registration Open': return 'bg-green-100 text-green-700';
      case 'Registration Closed': return 'bg-red-100 text-red-700';
      case 'Ongoing': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-purple-100 text-purple-700';
      case 'Archived': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-cairo mb-2">إدارة الفعاليات</h1>
          <p className="text-gray-600">أضف، عدل، وقم بإدارة دورة حياة الفعاليات.</p>
        </div>
        <Link 
          href="/admin/events/create" 
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center shadow-sm"
        >
          <Plus size={20} className="me-2" />
          إضافة فعالية
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا توجد فعاليات. قم بإضافة فعالية جديدة للبدء.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الفعالية</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">النوع</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => {
                  const eventDate = event.date instanceof Date ? event.date : (event.date as { toDate?: () => Date })?.toDate?.() || new Date();
                  
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500">{event.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{format(eventDate, 'dd MMM yyyy', { locale: ar })}</div>
                        <div className="text-sm text-gray-500">{format(eventDate, 'HH:mm')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{event.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(event.state)}`}>
                          {event.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-start text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link href={`/admin/events/${event.id}/registrations`} className="text-purple-600 hover:text-purple-900 bg-purple-50 p-2 rounded-lg" title="التسجيلات">
                            <Users size={16} />
                          </Link>
                          
                          <Link href={`/admin/events/${event.id}/checkin-desk`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg" title="منصة التحضير (QR)">
                            <QrCode size={16} />
                          </Link>

                          <Link href={`/admin/events/${event.id}/certificates`} className="text-emerald-600 hover:text-emerald-900 bg-emerald-50 p-2 rounded-lg" title="الشهادات">
                            <Award size={16} />
                          </Link>

                          <Link href={`/admin/events/${event.id}/feedback`} className="text-amber-600 hover:text-amber-900 bg-amber-50 p-2 rounded-lg" title="التقييمات والانطباعات">
                            <Star size={16} />
                          </Link>

                          <Link href={`/events/${event.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg" title="عرض الفعالية">
                            <Eye size={16} />
                          </Link>
                          
                          <button
                            onClick={() => handleTogglePin(event.id, !!event.isPinned)}
                            className={`p-2 rounded-lg transition-colors ${
                              event.isPinned ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                            }`}
                            title={event.isPinned ? 'إلغاء التثبيت' : 'تثبيت الفعالية بالبداية'}
                          >
                            <Pin size={16} className={event.isPinned ? 'fill-current' : ''} />
                          </button>

                          <Link href={`/admin/events/${event.id}/edit`} className="text-amber-600 hover:text-amber-900 bg-amber-50 p-2 rounded-lg" title="تعديل الفعالية">
                            <Edit2 size={16} />
                          </Link>
                          
                          <select 
                            value={event.state} 
                            onChange={(e) => handleStateChange(event.id, e.target.value as EventState)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                            <option value="Registration Open">Registration Open</option>
                            <option value="Registration Closed">Registration Closed</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Completed">Completed</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

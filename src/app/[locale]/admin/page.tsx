'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, doc, getDoc, setDoc, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Users, Calendar, CheckSquare, Award, Save, Settings, Star, LayoutTemplate } from 'lucide-react';
import { PlatformEvent } from '@/lib/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    certificatesIssued: 0,
  });
  
  const [heroStats, setHeroStats] = useState({
    membersCount: '+500',
    eventsCount: '+25',
    tracksCount: '4',
    featuredEventId: '',
    showStructure: true,
    heroTitle: '',
    heroSubtitleAr: '',
    heroSubtitleEn: '',
  });
  const [savingHeroStats, setSavingHeroStats] = useState(false);
  const [allEvents, setAllEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const eventsQ = query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Ongoing']));
        
        const [usersCountSnap, eventsSnap, regsCountSnap, certsCountSnap, heroDoc] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getDocs(eventsQ),
          getCountFromServer(collection(db, 'registrations')),
          getCountFromServer(collection(db, 'certificates')),
          getDoc(doc(db, 'settings', 'homepage')),
        ]);
        
        // Populate dropdown with active events
        const evs = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlatformEvent));
        setAllEvents(evs);

        setStats({
          totalUsers: usersCountSnap.data().count,
          activeEvents: eventsSnap.size,
          totalRegistrations: regsCountSnap.data().count,
          certificatesIssued: certsCountSnap.data().count,
        });

        if (heroDoc.exists()) {
          setHeroStats(prev => ({ ...prev, ...heroDoc.data() }));
        }

      } catch (error) {
        console.error("Error fetching stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSaveHeroStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHeroStats(true);
    try {
      await setDoc(doc(db, 'settings', 'homepage'), heroStats, { merge: true });
      alert('تم تحديث إحصائيات الرئيسية بنجاح');
    } catch (error) {
      console.error('Error saving hero stats:', error);
      alert('حدث خطأ أثناء حفظ الإحصائيات');
    } finally {
      setSavingHeroStats(false);
    }
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  const statCards = [
    { label: 'إجمالي الطلاب', value: stats.totalUsers, icon: <Users className="h-8 w-8 text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'الفعاليات النشطة', value: stats.activeEvents, icon: <Calendar className="h-8 w-8 text-purple-500" />, bg: 'bg-purple-50' },
    { label: 'إجمالي التسجيلات', value: stats.totalRegistrations, icon: <CheckSquare className="h-8 w-8 text-green-500" />, bg: 'bg-green-50' },
    { label: 'الشهادات المصدرة', value: stats.certificatesIssued, icon: <Award className="h-8 w-8 text-yellow-500" />, bg: 'bg-yellow-50' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 font-cairo mb-8">نظرة عامة</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className={`h-16 w-16 rounded-xl ${stat.bg} flex items-center justify-center me-4 flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSaveHeroStats} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Stats */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-cairo mb-2 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                إعدادات الصفحة الرئيسية
              </h2>
              <p className="text-gray-500 text-sm">
                قم بتحديث الأرقام المعروضة في شريط الإحصائيات.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأعضاء</label>
                <input 
                  type="text" 
                  value={heroStats.membersCount}
                  onChange={e => setHeroStats({...heroStats, membersCount: e.target.value})}
                  placeholder="+500"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border text-left rtl:text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفعاليات وورش العمل</label>
                <input 
                  type="text" 
                  value={heroStats.eventsCount}
                  onChange={e => setHeroStats({...heroStats, eventsCount: e.target.value})}
                  placeholder="+25"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border text-left rtl:text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المسارات واللجان</label>
                <input 
                  type="text" 
                  value={heroStats.tracksCount}
                  onChange={e => setHeroStats({...heroStats, tracksCount: e.target.value})}
                  placeholder="4"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border text-left rtl:text-right"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 font-cairo">نصوص الواجهة (Hero Texts)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان الرئيسي</label>
                <input 
                  type="text" 
                  value={heroStats.heroTitle || ''}
                  onChange={e => setHeroStats({...heroStats, heroTitle: e.target.value})}
                  placeholder="مثال: IEEE QASSIM"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف الفرعي (عربي)</label>
                <textarea 
                  value={heroStats.heroSubtitleAr || ''}
                  onChange={e => setHeroStats({...heroStats, heroSubtitleAr: e.target.value})}
                  placeholder="المنصة الرسمية للمجتمع الطلابي التقني والهندسي في جامعة القصيم."
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border text-right resize-none h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف الفرعي (إنجليزي)</label>
                <textarea 
                  value={heroStats.heroSubtitleEn || ''}
                  onChange={e => setHeroStats({...heroStats, heroSubtitleEn: e.target.value})}
                  placeholder="The official platform for the engineering and tech student community at Qassim University."
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border text-left resize-none h-20"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-cairo mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              الفعالية المميزة في الرئيسية
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              اختر الفعالية التي ستظهر في الكرت الرئيسي في واجهة الموقع. إذا تركت فارغة، سيتم عرض أحدث فعالية تلقائياً.
            </p>
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">الفعالية المميزة</label>
              <select
                value={heroStats.featuredEventId || ''}
                onChange={e => setHeroStats({...heroStats, featuredEventId: e.target.value})}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border bg-white"
              >
                <option value="">-- تلقائي (أحدث فعالية) --</option>
                {allEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 font-cairo mb-4 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-indigo-500" />
              هيكلة وإدارات النادي (IEEE Structure)
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              التحكم في ظهور قسم "هيكلة مجتمع IEEE" في الصفحة الرئيسية.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={heroStats.showStructure ?? true}
                onChange={e => setHeroStats({...heroStats, showStructure: e.target.checked})}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-gray-700">عرض قسم هيكلة النادي للزوار</span>
            </label>
          </div>
        </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={savingHeroStats}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-sm shadow-blue-500/20 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {savingHeroStats ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

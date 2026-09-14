'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Users, Calendar, CheckSquare, Award, Save, Settings } from 'lucide-react';

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
    tracksCount: '4'
  });
  const [savingHeroStats, setSavingHeroStats] = useState(false);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const eventsQ = query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Ongoing']));
        const eventsSnap = await getDocs(eventsQ);
        
        const regsSnap = await getDocs(collection(db, 'registrations'));
        const certsSnap = await getDocs(collection(db, 'certificates'));

        setStats({
          totalUsers: usersSnap.size,
          activeEvents: eventsSnap.size,
          totalRegistrations: regsSnap.size,
          certificatesIssued: certsSnap.size,
        });

        // Fetch Hero Stats Settings
        const heroDoc = await getDoc(doc(db, 'settings', 'homepage'));
        if (heroDoc.exists()) {
          setHeroStats(heroDoc.data() as any);
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
      await setDoc(doc(db, 'settings', 'homepage'), heroStats);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 font-cairo mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            إعدادات الصفحة الرئيسية (شريط الإحصائيات)
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            قم بتحديث الأرقام المعروضة في شريط الإحصائيات في الصفحة الرئيسية للمنصة.
          </p>
          
          <form onSubmit={handleSaveHeroStats} className="space-y-4">
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
            
            <button 
              type="submit" 
              disabled={savingHeroStats}
              className="mt-4 flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
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
          </form>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 font-cairo mb-4">أهلاً بك في لوحة الإدارة</h2>
          <p className="text-gray-600 mb-4">
            من هنا يمكنك إدارة الفعاليات، متابعة تسجيلات الطلاب، إصدار الشهادات، وتسجيل الحضور باستخدام رمز (QR Code).
          </p>
          <p className="text-gray-600">
            استخدم القائمة الجانبية للوصول إلى الأقسام المختلفة.
          </p>
        </div>
      </div>
    </div>
  );
}

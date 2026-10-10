'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Save, Settings, Star, LayoutTemplate } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import type { PlatformEvent } from '@/lib/types';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { httpsCallable } from '@/lib/backend';

export default function AdminContentPage() {
  const isAr = useLocale() === 'ar';
  const [heroStats, setHeroStats] = useState({ membersCount: '+500', eventsCount: '+25', tracksCount: '4', featuredEventId: '', showStructure: true, heroTitle: '', heroSubtitleAr: '', heroSubtitleEn: '' });
  const [allEvents, setAllEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHeroStats, setSavingHeroStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [settings, events] = await Promise.all([getDoc(doc(db, 'settings', 'homepage')), getDocs(query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Registration Closed', 'Ongoing']), limit(50)))]);
        if (!active) return;
        if (settings.exists()) setHeroStats(previous => ({ ...previous, ...Object.fromEntries(Object.keys(previous).filter(key => settings.data()[key] !== undefined).map(key => [key, settings.data()[key]])) }));
        setAllEvents(events.docs.map(item => ({ id: item.id, ...item.data() } as PlatformEvent)));
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load content'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [revision]);
  const handleSaveHeroStats = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingHeroStats(true); setSaved(false); setError(null);
    try { await httpsCallable(null, 'saveHomepage')(heroStats); setSaved(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save content'); }
    finally { setSavingHeroStats(false); }
  };
  if (loading) return <AdminLoading />;
  return <div className="space-y-5">
    <header><h1 className="text-3xl font-black font-cairo">{isAr ? 'محتوى الموقع' : 'Site content'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'الأرقام هنا تسويقية يدوية وليست إحصاءات تشغيلية. راجع دقتها قبل النشر.' : 'These are manually managed marketing figures, not operational analytics. Check their accuracy before publishing.'}</p><Link href="/admin" className="mt-2 inline-block text-sm text-purple-600">{isAr ? 'العودة لمركز العمل' : 'Back to command center'}</Link></header>
    {error && <AdminError message={error} retry={() => setRevision(value => value + 1)} />}
    {saved && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">{isAr ? 'تم حفظ المحتوى بنجاح.' : 'Content saved successfully.'}</p>}
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
              التحكم في ظهور قسم &quot;هيكلة مجتمع IEEE&quot; في الصفحة الرئيسية.
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

  </div>;
}

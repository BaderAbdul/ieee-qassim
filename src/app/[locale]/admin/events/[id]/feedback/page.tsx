'use client';

import { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { PlatformEvent, EventFeedbackResponse } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { Star, Download, ArrowRight, Loader2, MessageSquare, BarChart3, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toJsDate } from '@/lib/dateUtils';

const getMillis = (value: unknown): number => toJsDate(value)?.getTime() || 0;

export default function EventFeedbackDashboardPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id: eventId, locale } = use(params);
  const isAr = locale === 'ar';

  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [feedbacks, setFeedbacks] = useState<EventFeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Event
        const evSnap = await getDoc(doc(db, 'events', eventId));
        if (evSnap.exists()) {
          setEvent({ id: evSnap.id, ...evSnap.data() } as PlatformEvent);
        }

        // 2. Fetch Feedback entries
        const q = query(collection(db, 'event_feedback'), where('eventId', '==', eventId));
        const fbSnap = await getDocs(q);
        const list: EventFeedbackResponse[] = [];
        fbSnap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as EventFeedbackResponse);
        });

        // Sort latest first
        list.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

        setFeedbacks(list);
      } catch (err) {
        console.error("Error fetching event feedback analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // Statistics calculation
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 ? (feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / totalCount).toFixed(1) : '0.0';

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbacks.forEach((f) => {
    const r = Math.min(5, Math.max(1, f.rating || 5));
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
  });

  // CSV Export
  const exportToCSV = () => {
    if (feedbacks.length === 0) return;

    const headers = ['Feedback ID', 'User ID', 'User Email', 'Rating (Stars)', 'Created At'];
    
    // Add custom question headers if configured
    const customQuestions = event?.feedbackQuestions || [];
    customQuestions.forEach((q) => headers.push(`"${q.title.replace(/"/g, '""')}"`));

    const rows = feedbacks.map((f) => {
      const millis = getMillis(f.createdAt);
      const createdAtStr = millis > 0 ? new Date(millis).toISOString() : new Date().toISOString();

      const base = [
        `"${f.id}"`,
        `"${f.userId}"`,
        `"${f.userEmail || ''}"`,
        f.rating || 5,
        `"${createdAtStr}"`,
      ];

      customQuestions.forEach((q) => {
        const ans = f.answers?.[q.id] || '';
        base.push(`"${ans.replace(/"/g, '""')}"`);
      });

      return base.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Event_Feedback_${event?.title || eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">{isAr ? 'جاري تحميل لوحة انطباعات الفعالية...' : 'Loading feedback analytics...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <Link href="/admin/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 mb-2 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>{isAr ? 'العودة لقائمة الفعاليات' : 'Back to Events'}</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 font-cairo">
            {isAr ? 'انطباعات وتقييمات الفعالية' : 'Event Feedback & Ratings'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {event?.title}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={feedbacks.length === 0}
          className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{isAr ? 'تصدير تقرير CSV' : 'Export CSV Report'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 flex items-center justify-between">
          <div>
            <div className="text-amber-100 text-xs font-bold mb-1">{isAr ? 'متوسط التقييم العام' : 'Average Star Rating'}</div>
            <div className="text-4xl font-black flex items-center gap-2">
              <span>{avgRating}</span>
              <span className="text-2xl text-amber-200">/ 5</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-amber-200">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(Number(avgRating)) ? 'fill-white text-white' : 'text-amber-300 fill-amber-300/40'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Star className="w-8 h-8 text-white fill-white" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold mb-1">{isAr ? 'إجمالي المحضرين والتقييمات' : 'Total Submissions'}</div>
            <div className="text-4xl font-black text-slate-900">{totalCount}</div>
            <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{isAr ? 'تم التحضير والتقييم بنجاح' : 'Feedback submitted on check-in'}</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-xs font-bold mb-1">{isAr ? 'نسبة الرضا الممتاز (5 نجوم)' : '5-Star Satisfaction Rate'}</div>
            <div className="text-4xl font-black text-slate-900">
              {totalCount > 0 ? `${Math.round((ratingCounts[5] / totalCount) * 100)}%` : '0%'}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              {ratingCounts[5]} {isAr ? 'مشارك قيم بـ 5 نجوم' : '5-star reviews'}
            </div>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Rating Distribution Bars */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <span>{isAr ? 'توزيع التقييمات حسب النجوم ⭐' : 'Rating Distribution'}</span>
        </h3>

        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars] || 0;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-4 text-xs font-bold text-slate-700">
                <div className="w-20 flex items-center gap-1">
                  <span>{stars}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-left font-mono text-slate-500">
                  {count} ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedbacks List / Responses */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {isAr ? 'سجل الانطباعات والتقييمات الأخيرة' : 'Recent Feedback Submissions'}
          </h3>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {feedbacks.length} {isAr ? 'تقييم' : 'entries'}
          </span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {isAr ? 'لا توجد تقييمات مسجلة لهذه الفعالية حتى الآن.' : 'No feedback submitted yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {feedbacks.map((item) => {
              const millis = getMillis(item.createdAt);
              const dateStr = millis > 0 ? format(new Date(millis), 'dd MMM yyyy - HH:mm', { locale: ar }) : '';

              return (
                <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {item.userEmail || (isAr ? 'مستخدم مجهول' : 'Anonymous User')}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{dateStr}</div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <span className="text-xs font-black text-amber-700">{item.rating || 5}</span>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </div>
                  </div>

                  {/* Answers to Custom Questions */}
                  {item.answers && Object.keys(item.answers).length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                      {Object.entries(item.answers).map(([qId, ans]) => {
                        const questionObj = event?.feedbackQuestions?.find((q) => q.id === qId);
                        return (
                          <div key={qId} className="text-xs">
                            <span className="font-bold text-slate-700">{questionObj?.title || qId}: </span>
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{ans}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

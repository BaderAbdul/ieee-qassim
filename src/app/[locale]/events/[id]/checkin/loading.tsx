import { Star } from 'lucide-react';
import { RequiredFeedbackDialog } from '@/components/events/RequiredFeedbackDialog';

/** Stream the rating shell while the route's JavaScript and parameters are loading. */
export default function CheckinLoading() {
  return <RequiredFeedbackDialog eventId="checkin-loading">
    <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center" aria-busy="true">
      <h1 className="mb-6 text-xl font-bold">تقييم الفعالية / Event feedback</h1>
      <div className="mb-5 flex justify-center gap-3" aria-label="5 / 5">
        {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-8 w-8 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-slate-500" role="status">جاري تجهيز أسئلة الفعالية / Preparing event questions</p>
    </section>
  </RequiredFeedbackDialog>;
}

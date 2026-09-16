'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb, X, Send, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useLocale } from 'next-intl';

export default function IdeaFloatingButton() {
  const { user, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const locale = useLocale();
  const isAr = locale === 'ar';

  // Only show to logged in users
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'ideas'), {
        userId: user.uid,
        userName: userData?.arabicFullName || userData?.name || user.displayName || 'Unknown',
        userEmail: user.email,
        type,
        title,
        description,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setTitle('');
        setDescription('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting idea:', error);
      alert(isAr ? 'حدث خطأ أثناء الإرسال. حاول مرة أخرى.' : 'Error submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 rtl:left-6 ltr:right-6 z-40 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white p-4 rounded-full shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-1 transition-all duration-300 group flex items-center justify-center border border-white/20"
        aria-label={isAr ? 'شارك فكرتك' : 'Share your idea'}
      >
        <Lightbulb className="w-6 h-6 animate-pulse group-hover:animate-none" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black font-cairo text-amber-900">
                  {isAr ? 'شاركنا فكرتك!' : 'Share Your Idea!'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">
                    {isAr ? 'شكراً لمساهمتك!' : 'Thank you for your contribution!'}
                  </h4>
                  <p className="text-slate-500">
                    {isAr
                      ? 'تم إرسال مشاركتك بنجاح. سيقوم فريق الإدارة بمراجعتها قريباً.'
                      : 'Your submission has been sent successfully. The admin team will review it soon.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <p className="text-sm text-slate-600 mb-4 font-medium leading-relaxed">
                    {isAr
                      ? 'لديك فكرة لفعالية؟ مبادرة مجتمعية؟ أو ترغب بتقديم ورشة عمل في مجال خبرتك؟ تفضل بمشاركتها معنا!'
                      : 'Have an idea for an event? A community initiative? Or want to present a workshop? Share it with us.'}
                  </p>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {isAr ? 'نوع المشاركة' : 'Submission Type'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setType('idea')}
                        className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                          type === 'idea'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isAr ? 'اقتراح فعالية' : 'Event Idea'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('workshop')}
                        className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                          type === 'workshop'
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isAr ? 'تقديم ورشة' : 'Host Workshop'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('initiative')}
                        className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
                          type === 'initiative'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isAr ? 'مبادرة' : 'Initiative'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="title">
                      {isAr ? 'العنوان' : 'Title'}
                    </label>
                    <input
                      id="title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isAr ? 'اكتب عنواناً مختصراً وواضحاً' : 'Write a short and clear title'}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="description">
                      {isAr ? 'التفاصيل' : 'Details'}
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        isAr
                          ? 'اشرح فكرتك أو الورشة التي تود تقديمها، وما هي الفائدة المرجوة منها...'
                          : 'Explain your idea or the workshop you want to present...'
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !description.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 rtl:-scale-x-100" />
                          <span>{isAr ? 'إرسال المشاركة' : 'Submit'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

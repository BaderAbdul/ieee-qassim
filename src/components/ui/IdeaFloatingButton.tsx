'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const locale = useLocale();
  const isAr = locale === 'ar';

  const canSubmit = !!user && !userData?.isRestricted;

  useEffect(() => {
    if (!canSubmit) return;
    const open = () => { setError(''); setIsOpen(true); };
    window.addEventListener('ieee-open-suggestion', open);
    return () => window.removeEventListener('ieee-open-suggestion', open);
  }, [canSubmit]);

  useEffect(() => {
    if (!isOpen || !canSubmit || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    titleRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen, canSubmit]);

  useEffect(() => {
    if (isOpen && success) doneRef.current?.focus();
  }, [isOpen, success]);

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    if (success) { setSuccess(false); setTitle(''); setDescription(''); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit || isSubmitting || !title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'ideas'), {
        userId: user.uid,
        userName: userData?.arabicFullName || user.displayName || 'Unknown',
        type,
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (error) {
      console.error('Error submitting idea:', error);
      setError(isAr ? 'تعذر إرسال المشاركة. بياناتك محفوظة هنا؛ حاول مرة أخرى.' : 'Could not send your suggestion. Your draft is still here; please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canSubmit) return null;

  return (
      <dialog
        ref={dialogRef}
        aria-labelledby="suggestion-heading"
        aria-describedby="suggestion-description"
        onCancel={event => { if (isSubmitting) event.preventDefault(); }}
        onClose={close}
        onClick={event => { if (event.target === event.currentTarget) close(); }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm"
      >
            {/* Header */}
            <div className="bg-amber-50 px-4 py-4 flex items-center justify-between gap-2 border-b border-amber-100 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h3 id="suggestion-heading" className="text-lg leading-snug font-bold text-slate-900 sm:text-xl">
                  {isAr ? 'شاركنا فكرتك!' : 'Share Your Idea!'}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={isSubmitting}
                aria-label={isAr ? 'إغلاق الاقتراح' : 'Close suggestion'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {success ? (
                <div className="text-center py-8" role="status">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">
                    {isAr ? 'شكراً لمساهمتك!' : 'Thank you for your contribution!'}
                  </h4>
                  <p id="suggestion-description" className="text-slate-600">
                    {isAr
                      ? 'تم إرسال مشاركتك بنجاح. سيقوم فريق الإدارة بمراجعتها قريباً.'
                      : 'Your submission has been sent successfully. The admin team will review it soon.'}
                  </p>
                  <button ref={doneRef} type="button" onClick={close} className="mt-6 min-h-11 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">{isAr ? 'تم' : 'Done'}</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
                  <p id="suggestion-description" className="text-sm text-slate-600 mb-4 font-medium leading-relaxed">
                    {isAr
                      ? 'لديك فكرة لفعالية؟ مبادرة مجتمعية؟ أو ترغب بتقديم ورشة عمل في مجال خبرتك؟ تفضل بمشاركتها معنا!'
                      : 'Have an idea for an event? A community initiative? Or want to present a workshop? Share it with us.'}
                  </p>

                  <fieldset disabled={isSubmitting}>
                    <legend className="block text-sm font-bold text-slate-700 mb-2">
                      {isAr ? 'نوع المشاركة' : 'Submission Type'}
                    </legend>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setType('idea')}
                        aria-pressed={type === 'idea'}
                        className={`min-h-11 min-w-0 break-words py-2 px-1.5 rounded-xl text-sm leading-snug font-bold border transition-colors ${
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
                        aria-pressed={type === 'workshop'}
                        className={`min-h-11 min-w-0 break-words py-2 px-1.5 rounded-xl text-sm leading-snug font-bold border transition-colors ${
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
                        aria-pressed={type === 'initiative'}
                        className={`min-h-11 min-w-0 break-words py-2 px-1.5 rounded-xl text-sm leading-snug font-bold border transition-colors ${
                          type === 'initiative'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isAr ? 'مبادرة' : 'Initiative'}
                      </button>
                    </div>
                  </fieldset>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="suggestion-title">
                      {isAr ? 'العنوان' : 'Title'}
                    </label>
                    <input
                      id="suggestion-title"
                      ref={titleRef}
                      type="text"
                      required
                      disabled={isSubmitting}
                      maxLength={160}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isAr ? 'اكتب عنواناً مختصراً وواضحاً' : 'Write a short and clear title'}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="suggestion-details">
                      {isAr ? 'التفاصيل' : 'Details'}
                    </label>
                    <textarea
                      id="suggestion-details"
                      required
                      disabled={isSubmitting}
                      maxLength={5000}
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

                  {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !title.trim() || !description.trim()}
                      className="w-full min-h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <><Loader2 aria-hidden="true" className="w-5 h-5 animate-spin" /><span role="status">{isAr ? 'جارٍ الإرسال…' : 'Sending…'}</span></>
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
      </dialog>
  );
}

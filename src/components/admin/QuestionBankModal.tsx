'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  RotateCcw, 
  Tag, 
  HelpCircle,
  BookmarkPlus
} from 'lucide-react';
import { CustomQuestion } from '@/lib/types';
import { 
  ArchivedQuestion, 
  getArchivedQuestions, 
  saveQuestionToBank, 
  removeQuestionFromBank, 
  resetToDefaultBank 
} from '@/lib/feedbackQuestionBank';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestion: (question: CustomQuestion) => void;
  currentEventQuestions?: CustomQuestion[];
}

export default function QuestionBankModal({
  isOpen,
  onClose,
  onImportQuestion,
  currentEventQuestions = [],
}: QuestionBankModalProps) {
  const [questions, setQuestions] = useState<ArchivedQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'choice' | 'text'>('all');
  const [justImportedId, setJustImportedId] = useState<string | null>(null);
  
  // Quick Add inline form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'choice' | 'text'>('choice');
  const [newOptionsStr, setNewOptionsStr] = useState('محتوى مميز, تنظيم رائع, تفاعل ممتاز');
  const [newChipsStr, setNewChipsStr] = useState('محتوى رائع, شكراً لكم, تنظيم ممتاز');
  const [newRequired, setNewRequired] = useState(false);

  // Load questions
  const refreshQuestions = () => {
    setQuestions(getArchivedQuestions());
  };

  useEffect(() => {
    if (isOpen) {
      refreshQuestions();
    }
  }, [isOpen]);

  // Listen to bank updates
  useEffect(() => {
    const handleUpdate = () => {
      refreshQuestions();
    };
    window.addEventListener('ieee-question-bank-updated', handleUpdate);
    return () => window.removeEventListener('ieee-question-bank-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (selectedTab !== 'all' && q.type !== selectedTab) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const titleMatch = q.title.toLowerCase().includes(query);
    const optionsMatch = q.options?.some(o => o.toLowerCase().includes(query));
    const chipsMatch = q.quickChips?.some(c => c.toLowerCase().includes(query));
    return titleMatch || optionsMatch || chipsMatch;
  });

  const handleImport = (q: ArchivedQuestion) => {
    const freshQuestion: CustomQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: q.title,
      type: q.type,
      options: q.options ? [...q.options] : [],
      quickChips: q.quickChips ? [...q.quickChips] : [],
      placeholder: q.placeholder || '',
      required: q.required,
    };
    onImportQuestion(freshQuestion);
    setJustImportedId(q.id);
    setTimeout(() => {
      setJustImportedId(null);
    }, 1800);
  };

  const handleDelete = (q: ArchivedQuestion) => {
    if (confirm(`هل أنت متأكد من حذف سؤال "${q.title}" من الأرشيف نهائياً؟`)) {
      removeQuestionFromBank(q.id);
      refreshQuestions();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('هل ترغب في استعادة بنك الأسئلة الافتراضي المعتمد لنادي IEEE؟')) {
      resetToDefaultBank();
      refreshQuestions();
    }
  };

  const handleCreateNewInBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const options = newType === 'choice' 
      ? newOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const quickChips = newType === 'text'
      ? newChipsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    saveQuestionToBank({
      title: newTitle.trim(),
      type: newType,
      options,
      quickChips,
      required: newRequired,
    }, 'user');

    setNewTitle('');
    setShowAddForm(false);
    refreshQuestions();
  };

  // Helper to check if title is already in current event
  const isAlreadyInEvent = (title: string) => {
    return currentEventQuestions.some(
      eq => eq.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-bank-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-7 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-6 top-6 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-2xl transition-all"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-500/20 border border-purple-400/30 rounded-2xl">
              <Archive className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 id="question-bank-title" className="text-xl sm:text-2xl font-bold font-cairo flex items-center gap-2">
                <span>أرشيف وبنك أسئلة التقييم</span>
                <span className="text-xs bg-purple-500/30 border border-purple-400/30 text-purple-200 font-normal px-2.5 py-0.5 rounded-full">
                  {questions.length} سؤال محفوظ
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                استورد أسئلة جاهزة لفعاليتك الحالية أو احذف ما لا تحتاجه من الأرشيف دون الحاجة لكتابتها مجدداً.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Tabs & Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الأسئلة أو الخيارات..."
                className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة للأرشيف</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1 whitespace-nowrap"
                title="استعادة الأسئلة الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">استعادة النماذج</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTab === 'all'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              الكل ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('choice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTab === 'choice'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              خيارات سريعة ({questions.filter(q => q.type === 'choice').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTab === 'text'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              نص حر ومقترحات ({questions.filter(q => q.type === 'text').length})
            </button>
          </div>
        </div>

        {/* Inline Add Form */}
        {showAddForm && (
          <form 
            onSubmit={handleCreateNewInBank}
            className="p-5 bg-purple-50/70 border-b border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-purple-600" />
                <span>حفظ سؤال جديد مباشرة في الأرشيف</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                إلغاء
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">نص السؤال</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: كيف تقيم وضوح الشرح النظري؟"
                  className="w-full text-xs sm:text-sm border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع السؤال</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'choice' | 'text')}
                  className="w-full text-xs sm:text-sm border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="choice">خيارات سريعة (Pills)</option>
                  <option value="text">نص حر مع مقترحات</option>
                </select>
              </div>
            </div>

            {newType === 'choice' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الخيارات (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={newOptionsStr}
                  onChange={(e) => setNewOptionsStr(e.target.value)}
                  placeholder="ممتاز, جيد جداً, مناسب"
                  className="w-full text-xs border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المقترحات السريعة (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={newChipsStr}
                  onChange={(e) => setNewChipsStr(e.target.value)}
                  placeholder="محتوى ممتاز, شكراً للمنظمين"
                  className="w-full text-xs border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                />
                <span>إجابة إجبارية افتراضياً</span>
              </label>

              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                حفظ في الأرشيف
              </button>
            </div>
          </form>
        )}

        {/* Scrollable Questions List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Archive className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-cairo">لا توجد أسئلة مطابقة</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? 'لم نجد أسئلة تطابق بحثك. جرّب كلمات مختلفة أو قم بإلغاء التصفية.'
                  : 'الأرشيف فارغ حالياً. يمكنك إضافة أسئلة جديدة أو استعادة النماذج الافتراضية.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold transition-all"
                  >
                    مسح البحث
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3.5 py-1.5 rounded-xl font-bold transition-all"
                >
                  استعادة النماذج الافتراضية
                </button>
              </div>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const inCurrent = isAlreadyInEvent(q.title);
              const isJustImported = justImportedId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1">
                    {/* Title & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 font-cairo">
                        {q.title}
                      </h4>

                      {/* Type Badge */}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        q.type === 'choice'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                      }`}>
                        {q.type === 'choice' ? 'خيارات سريعة' : 'نص حر'}
                      </span>

                      {/* Required Badge */}
                      {q.required && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                          إلزامي
                        </span>
                      )}

                      {/* In Current Event Badge */}
                      {inCurrent && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>مضاف للفعالية</span>
                        </span>
                      )}
                    </div>

                    {/* Options / Chips preview */}
                    {q.type === 'choice' && q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-medium">الخيارات:</span>
                        {q.options.map((opt, oIdx) => (
                          <span
                            key={oIdx}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/60"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {q.type === 'text' && q.quickChips && q.quickChips.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-medium">مقترحات الكتابة:</span>
                        {q.quickChips.map((chip, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/60"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {/* Import / Add button */}
                    <button
                      type="button"
                      onClick={() => handleImport(q)}
                      className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                        isJustImported
                          ? 'bg-emerald-600 text-white'
                          : inCurrent
                          ? 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 border border-slate-200'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isJustImported ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تمت الإضافة!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{inCurrent ? 'إضافة مجدداً' : 'استيراد للفعالية'}</span>
                        </>
                      )}
                    </button>

                    {/* Delete from archive button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(q)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                      title="حذف هذا السؤال من الأرشيف نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            💡 سيتم حفظ أي أسئلة مخصصة تضيفها إلى الفعالية في الأرشيف تلقائياً عند حفظ الفعالية.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

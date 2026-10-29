'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Trash2, 
  Check, 
  X, 
  Plus, 
  Copy, 
  Award, 
  Clock, 
  Users, 
  FileText, 
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  CustomEventTemplate, 
  getCustomEventTemplates, 
  deleteCustomEventTemplate, 
  saveCustomEventTemplate,
  createTemplateFromEvent 
} from '@/lib/customEventTemplates';
import type { PlatformEvent } from '@/lib/types';
import { httpsCallable } from '@/lib/backend';

interface EventTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate?: (template: CustomEventTemplate) => void;
  currentFormData?: any;
  currentQuestions?: any[];
  mode?: 'select' | 'manage';
}

export default function EventTemplatesModal({
  isOpen,
  onClose,
  onApplyTemplate,
  currentFormData,
  currentQuestions,
  mode = 'select'
}: EventTemplatesModalProps) {
  const [templates, setTemplates] = useState<CustomEventTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'my_templates' | 'from_events'>('my_templates');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Past events state for "Create template from any event"
  const [pastEvents, setPastEvents] = useState<PlatformEvent[]>([]);
  const [loadingPastEvents, setLoadingPastEvents] = useState(false);
  
  // Save current form as template state
  const [showSaveCurrentForm, setShowSaveCurrentForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Applied feedback state
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  const refreshTemplates = () => {
    setTemplates(getCustomEventTemplates());
  };

  useEffect(() => {
    if (isOpen) {
      refreshTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => refreshTemplates();
    window.addEventListener('ieee-event-templates-updated', handleUpdate);
    return () => window.removeEventListener('ieee-event-templates-updated', handleUpdate);
  }, []);

  // Fetch past events when tab is switched to 'from_events'
  useEffect(() => {
    if (isOpen && activeTab === 'from_events' && pastEvents.length === 0) {
      const fetchEvents = async () => {
        setLoadingPastEvents(true);
        try {
          const result = await httpsCallable<unknown, { events: PlatformEvent[] }>(null, 'getAdminEvents')({});
          setPastEvents(result.data.events);
        } catch (e) {
          console.error('Failed to load past events for templates', e);
        } finally {
          setLoadingPastEvents(false);
        }
      };
      fetchEvents();
    }
  }, [isOpen, activeTab, pastEvents.length]);

  if (!isOpen) return null;

  const handleDeleteTemplate = (tmpl: CustomEventTemplate) => {
    if (confirm(`هل أنت متأكد من حذف قالب "${tmpl.name}" نهائياً؟`)) {
      deleteCustomEventTemplate(tmpl.id);
      refreshTemplates();
    }
  };

  const handleApply = (tmpl: CustomEventTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(tmpl);
      setAppliedTemplateId(tmpl.id);
      setTimeout(() => {
        setAppliedTemplateId(null);
        onClose();
      }, 700);
    }
  };

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    if (!currentFormData) {
      alert('لا توجد بيانات فعالية حالية لحفظها كقالب.');
      return;
    }

    saveCustomEventTemplate({
      name: newTemplateName.trim(),
      description: currentFormData.description || '',
      descriptionEn: currentFormData.descriptionEn || '',
      type: currentFormData.type || 'Workshop',
      durationHours: Number(currentFormData.durationHours) || 2,
      capacity: Number(currentFormData.capacity) || 50,
      isUnlimitedCapacity: !!currentFormData.isUnlimitedCapacity,
      hideExactCapacity: !!currentFormData.hideExactCapacity,
      points: Number(currentFormData.points) || 10,
      hasCertificate: !!currentFormData.hasCertificate,
      requiresRegistration: currentFormData.requiresRegistration !== false && currentFormData.type !== 'Booth',
      isUnlisted: !!currentFormData.isUnlisted,
      registrationMode: currentFormData.registrationMode || 'Auto',
      location: currentFormData.location || '',
      locationEn: currentFormData.locationEn || '',
      gains: currentFormData.gains ? (Array.isArray(currentFormData.gains) ? currentFormData.gains : currentFormData.gains.split('\n').filter(Boolean)) : [],
      gainsEn: currentFormData.gainsEn ? (Array.isArray(currentFormData.gainsEn) ? currentFormData.gainsEn : currentFormData.gainsEn.split('\n').filter(Boolean)) : [],
      speakers: currentFormData.speakers ? (Array.isArray(currentFormData.speakers) ? currentFormData.speakers : currentFormData.speakers.split(',').map((s: string) => s.trim()).filter(Boolean)) : [],
      feedbackQuestions: currentQuestions || [],
    });

    setNewTemplateName('');
    setShowSaveCurrentForm(false);
    refreshTemplates();
    alert('تم حفظ القالب بنجاح في مكتبة القوالب الخاصة بك!');
  };

  const handleCreateFromPastEvent = (event: PlatformEvent) => {
    const customName = prompt('أدخل اسماً مميزاً لهذا القالب:', `قالب: ${event.title}`);
    if (customName === null) return;

    const created = createTemplateFromEvent(event, customName);
    refreshTemplates();
    setActiveTab('my_templates');
    alert(`تم إنشاء القالب "${created.name}" بنجاح!`);
  };

  const filteredTemplates = templates.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return t.name.toLowerCase().includes(q) || 
      t.type.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q));
  });

  const filteredPastEvents = pastEvents.filter(ev => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return ev.title.toLowerCase().includes(q) || 
      (ev.titleEn && ev.titleEn.toLowerCase().includes(q)) ||
      ev.type.toLowerCase().includes(q);
  });

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white p-6 sm:p-7 relative flex-shrink-0">
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
              <Layers className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 id="templates-modal-title" className="text-xl sm:text-2xl font-bold font-cairo flex items-center gap-2">
                <span>قوالب الفعاليات المخصصة</span>
                <span className="text-xs bg-purple-500/30 border border-purple-400/30 text-purple-200 font-normal px-2.5 py-0.5 rounded-full">
                  {templates.length} قالب محفوظ
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                أنشئ وطبّق قوالب تفاصيل الفعاليات بضغطة زر مع إمكانية تعديل أي تفصيل، أو احذف القوالب متى شئت.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar: Navigation & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('my_templates')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'my_templates'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                قوالبي المحفوظة ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('from_events')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'from_events'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                إنشاء قالب من فعالية سابقة
              </button>
            </div>

            {/* Quick action: Save Current Form */}
            {currentFormData && (
              <button
                type="button"
                onClick={() => setShowSaveCurrentForm(!showSaveCurrentForm)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>حفظ الحالية كقالب</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'my_templates' ? 'ابحث في قوالبك بالاسم أو النوع...' : 'ابحث في الفعاليات السابقة لنسخها كقالب...'}
              className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Inline Save Current Form Box */}
        {showSaveCurrentForm && (
          <form 
            onSubmit={handleSaveCurrentAsTemplate}
            className="p-5 bg-purple-50/80 border-b border-purple-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex-1">
              <label className="block text-xs font-bold text-purple-900 mb-1">
                اسم القالب الجديد (مثلاً: ورشة برمجة 10 نقاط + شهادة)
              </label>
              <input
                type="text"
                required
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="أدخل اسماً واضحاً للقالب..."
                className="w-full text-xs sm:text-sm border-purple-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto sm:pt-5">
              <button
                type="button"
                onClick={() => setShowSaveCurrentForm(false)}
                className="text-slate-500 hover:text-slate-700 text-xs px-3 py-2"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                حفظ القالب الآن
              </button>
            </div>
          </form>
        )}

        {/* Tab 1: My Saved Templates */}
        {activeTab === 'my_templates' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-cairo">لا توجد قوالب محفوظة</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                  أنت المتحكم بالكامل! يمكنك حفظ بيانات أي فعالية حالية كقالب بضغطة زر، أو اختيار فعالية سابقة من التبويب أعلاه لتحويلها إلى قالب دائم يمكنك تطبيقه وتعديله متى شئت.
                </p>
                {currentFormData && (
                  <button
                    type="button"
                    onClick={() => setShowSaveCurrentForm(true)}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ بيانات الفعالية الحالية كقالب</span>
                  </button>
                )}
              </div>
            ) : (
              filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 font-cairo">
                        {tmpl.name}
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                        {tmpl.type}
                      </span>
                      {tmpl.hasCertificate && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>شهادة حضور</span>
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                        {tmpl.points} نقاط
                      </span>
                    </div>

                    {tmpl.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    )}

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>المدة: {tmpl.durationHours} ساعة</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>الموافقة: {tmpl.registrationMode === 'Auto' ? 'فورية' : 'يدوية'}</span>
                      </span>
                      {tmpl.feedbackQuestions && tmpl.feedbackQuestions.length > 0 && (
                        <span className="flex items-center gap-1 text-purple-600 font-medium">
                          <span>{tmpl.feedbackQuestions.length} أسئلة تقييم مدرجة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {onApplyTemplate && (
                      <button
                        type="button"
                        onClick={() => handleApply(tmpl)}
                        className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                          appliedTemplateId === tmpl.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {appliedTemplateId === tmpl.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>تم التطبيق!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>تطبيق القالب</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl)}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                      title="حذف هذا القالب نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Create Template from Past Events */}
        {activeTab === 'from_events' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
            {loadingPastEvents ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <span>جاري تحميل الفعاليات السابقة...</span>
              </div>
            ) : filteredPastEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                لا توجد فعاليات مطابقة للبحث.
              </div>
            ) : (
              filteredPastEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 font-cairo">
                        {ev.title}
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {ev.type}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                        {ev.points} نقاط
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateFromPastEvent(ev)}
                    className="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 self-end sm:self-center"
                  >
                    <Plus className="w-4 h-4 text-purple-600" />
                    <span>إنشاء قالب من هذه الفعالية</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            💡 تطبيق القالب يملأ الحقول وتستطيع بعدها تعديل أي معلومة ترغب بها بحرية.
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

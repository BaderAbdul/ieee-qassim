'use client';

import { formatDateSafe, parseRiyadhInput, toJsDate } from '@/lib/dateUtils';

import { uploadImage, httpsCallable } from '@/lib/backend';
import Image from 'next/image';

import { useState, useEffect, use } from 'react';
import { apiGet } from '@/lib/backend';
import { useRouter } from '@/i18n/routing';
import { EventType, RegistrationMode, CustomQuestion } from '@/lib/types';
import { ArrowRight, Save, Plus, Trash2, Archive, Bookmark, Check, Layers, BookmarkPlus } from 'lucide-react';
import { Link } from '@/i18n/routing';
import QuestionBankModal from '@/components/admin/QuestionBankModal';
import EventTemplatesModal from '@/components/admin/EventTemplatesModal';
import { 
  getArchivedQuestions, 
  saveQuestionToBank, 
  saveMultipleQuestionsToBank, 
  harvestQuestionsFromEvents 
} from '@/lib/feedbackQuestionBank';
import { CustomEventTemplate, getCustomEventTemplates } from '@/lib/customEventTemplates';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [eventRevision, setEventRevision] = useState(0);
  
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;
  
  const [formData, setFormData] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    type: 'Workshop' as EventType,
    date: '',
    time: '',
    location: '',
    locationEn: '',
    durationHours: 2,
    capacity: 50,
    isUnlimitedCapacity: false,
    hideExactCapacity: false,
    registeredCount: 0,
    attendanceCount: 0,
    points: 10,
    hasCertificate: false,
    requiresRegistration: true,
    isUnlisted: false,
    registrationMode: 'Auto' as RegistrationMode,
    gains: '',
    gainsEn: '',
    speakers: '',
    coverUrl: ''
  });

  const attendanceCount = formData.attendanceCount;

  const [feedbackQuestions, setFeedbackQuestions] = useState<CustomQuestion[]>([]);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankCount, setBankCount] = useState(0);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Custom Event Templates State
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templatesCount, setTemplatesCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setBankCount(getArchivedQuestions().length);
    };
    const updateTemplatesCount = () => {
      setTemplatesCount(getCustomEventTemplates().length);
    };
    updateCount();
    updateTemplatesCount();
    window.addEventListener('ieee-question-bank-updated', updateCount);
    window.addEventListener('ieee-event-templates-updated', updateTemplatesCount);
    return () => {
      window.removeEventListener('ieee-question-bank-updated', updateCount);
      window.removeEventListener('ieee-event-templates-updated', updateTemplatesCount);
    };
  }, []);

  const handleApplyTemplate = (template: CustomEventTemplate) => {
    setFormData(prev => ({
      ...prev,
      description: template.description || prev.description,
      descriptionEn: template.descriptionEn || prev.descriptionEn,
      type: template.type || prev.type,
      durationHours: template.durationHours ?? prev.durationHours,
      capacity: template.capacity ?? prev.capacity,
      isUnlimitedCapacity: !!template.isUnlimitedCapacity,
      hideExactCapacity: !!template.hideExactCapacity,
      points: template.points ?? prev.points,
      hasCertificate: !!template.hasCertificate,
      requiresRegistration: template.requiresRegistration !== false && template.type !== 'Booth',
      isUnlisted: !!template.isUnlisted,
      registrationMode: template.registrationMode || prev.registrationMode,
      location: template.location || prev.location,
      locationEn: template.locationEn || prev.locationEn,
      gains: template.gains ? template.gains.join('\n') : prev.gains,
      gainsEn: template.gainsEn ? template.gainsEn.join('\n') : prev.gainsEn,
      speakers: template.speakers ? template.speakers.join(', ') : prev.speakers,
    }));

    if (template.feedbackQuestions && template.feedbackQuestions.length > 0) {
      setFeedbackQuestions(template.feedbackQuestions.map(q => ({
        ...q,
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })));
    }
  };

  const addFeedbackQuestion = () => {
    const newQ: CustomQuestion = {
      id: `q_${Date.now()}`,
      title: '',
      type: 'choice',
      required: false,
      options: ['محتوى مميز', 'تنظيم رائع', 'تفاعل ممتاز'],
    };
    setFeedbackQuestions(prev => [...prev, newQ]);
  };

  const removeFeedbackQuestion = (id: string) => {
    setFeedbackQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateFeedbackQuestion = (id: string, field: keyof CustomQuestion, value: CustomQuestion[keyof CustomQuestion]) => {
    setFeedbackQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleImportQuestion = (q: CustomQuestion) => {
    setFeedbackQuestions(prev => [...prev, q]);
  };

  const handleSaveQuestionToBank = (q: CustomQuestion) => {
    if (!q.title.trim()) {
      alert('يرجى كتابة نص السؤال أولاً قبل حفظه في الأرشيف');
      return;
    }
    saveQuestionToBank(q, 'user');
    setSavedSuccessId(q.id);
    setTimeout(() => setSavedSuccessId(null), 2000);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await apiGet<Record<string, any>>(`/api/admin/events/${eventId}`);
        {
          const eventDate = new Date(data.date);
          setEventRevision(toJsDate(data.updatedAt)?.getTime() || 0);

          setFormData({
            title: data.title || '',
            titleEn: data.titleEn || '',
            description: data.description || '',
            descriptionEn: data.descriptionEn || '',
            type: data.type || 'Workshop',
            date: formatDateSafe(eventDate, 'yyyy-MM-dd'),
            time: formatDateSafe(eventDate, 'HH:mm'),
            location: data.location || '',
            locationEn: data.locationEn || '',
            durationHours: data.durationHours || 2,
            capacity: data.capacity ?? 50,
            isUnlimitedCapacity: data.isUnlimitedCapacity || false,
            hideExactCapacity: data.hideExactCapacity || false,
            registeredCount: data.registeredCount || 0,
            attendanceCount: data.attendanceCount || 0,
            points: data.points ?? 10,
            hasCertificate: data.hasCertificate || false,
            requiresRegistration: data.requiresRegistration !== false && data.type !== 'Booth',
            isUnlisted: data.isUnlisted || false,
            registrationMode: data.registrationMode || 'Auto',
            gains: data.gains ? data.gains.join('\n') : '',
            gainsEn: data.gainsEn ? data.gainsEn.join('\n') : '',
            speakers: data.speakers ? data.speakers.join(', ') : '',
            coverUrl: data.coverUrl || ''
          });

          if (data.feedbackQuestions && Array.isArray(data.feedbackQuestions)) {
            setFeedbackQuestions(data.feedbackQuestions);
            harvestQuestionsFromEvents([{ feedbackQuestions: data.feedbackQuestions }]);
          }
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'event', formData.coverUrl);
      setFormData(prev => ({ ...prev, coverUrl: url }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time
      const eventDate = parseRiyadhInput(formData.date, formData.time);
      
      const updatedEvent = {
        title: formData.title,
        titleEn: formData.titleEn,
        description: formData.description,
        descriptionEn: formData.descriptionEn,
        type: formData.type,
        date: eventDate,
        location: formData.location,
        locationEn: formData.locationEn,
        durationHours: formData.durationHours,
        capacity: formData.capacity,
        isUnlimitedCapacity: formData.isUnlimitedCapacity,
        hideExactCapacity: formData.hideExactCapacity,
        points: formData.points,
        hasCertificate: formData.hasCertificate,
        requiresRegistration: formData.requiresRegistration,
        isUnlisted: formData.isUnlisted,
        registrationMode: formData.registrationMode,
        coverUrl: formData.coverUrl,
        gains: formData.gains.split('\n').filter(g => g.trim()),
        gainsEn: formData.gainsEn.split('\n').filter(g => g.trim()),
        speakers: formData.speakers.split(',').map(s => s.trim()).filter(s => s),
        feedbackQuestions: feedbackQuestions.filter(q => q.title.trim().length > 0),
      };

      // Automatically remember feedback questions in the organizer bank
      saveMultipleQuestionsToBank(updatedEvent.feedbackQuestions, 'event');

      await httpsCallable(null, 'saveEvent')({ eventId, expectedUpdatedAt: eventRevision, ...updatedEvent });
      router.push('/admin/events');
    } catch (error) {
      console.error("Error updating event", error);
      alert(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الفعالية");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Link href="/admin/events" className="text-gray-500 hover:text-gray-900 me-4">
            <ArrowRight className="h-6 w-6 rtl:-scale-x-100" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 font-cairo">تعديل الفعالية</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>قوالب الفعاليات ({templatesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>حفظ كقالب جديد</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        
        {/* Section 1: Basic Info */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">المعلومات الأساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الفعالية (عربي)</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title (English)</label>
              <input required type="text" name="titleEn" value={formData.titleEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (عربي)</label>
              <textarea required name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
              <textarea required name="descriptionEn" rows={3} value={formData.descriptionEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الفعالية</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="Workshop">ورشة عمل (Workshop)</option>
                <option value="Camp">معسكر (Camp)</option>
                <option value="Lecture">محاضرة (Lecture)</option>
                <option value="Competition">مسابقة (Competition)</option>
                <option value="Meetup">لقاء (Meetup)</option>
                <option value="Challenge">تحدي (Challenge)</option>
                <option value="Booth">بوث / زيارة جناح (Booth / Visit)</option>
                <option value="Other">أخرى (Other)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">صورة الغلاف (Cover Image)</label>
              {formData.coverUrl && (
                <div className="mb-2 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={formData.coverUrl} alt="Cover Preview" width={600} height={128} unoptimized className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={isUploading}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer disabled:opacity-50" 
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Time & Location */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">الزمان والمكان</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
              <input required type="time" name="time" value={formData.time} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدة (ساعات)</label>
              <input required type="number" min="0.5" step="0.5" name="durationHours" value={formData.durationHours} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">المكان (عربي)</label>
              <input required type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (English)</label>
              <input required type="text" name="locationEn" value={formData.locationEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>
        </div>

        {/* Section 3: Registration & Rewards */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">التسجيل والمكتسبات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعة (عدد المقاعد)</label>
              <input 
                required={!formData.isUnlimitedCapacity}
                disabled={formData.isUnlimitedCapacity}
                type="number" 
                min="1" 
                name="capacity" 
                value={formData.capacity} 
                onChange={handleChange} 
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:bg-gray-100" 
              />
              
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center">
                  <input type="checkbox" id="isUnlimitedCapacity" name="isUnlimitedCapacity" checked={formData.isUnlimitedCapacity} onChange={handleChange} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                  <label htmlFor="isUnlimitedCapacity" className="ms-2 block text-sm font-medium text-gray-700">
                    تسجيل مفتوح (بدون حد أقصى)
                  </label>
                </div>
                {!formData.isUnlimitedCapacity && (
                  <div className="flex items-center">
                    <input type="checkbox" id="hideExactCapacity" name="hideExactCapacity" checked={formData.hideExactCapacity} onChange={handleChange} className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                    <label htmlFor="hideExactCapacity" className="ms-2 block text-sm font-medium text-gray-700">
                      إخفاء السعة للعامة (عرض &quot;مقاعد محدودة&quot; فقط)
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">آلية القبول</label>
              <select name="registrationMode" value={formData.registrationMode} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="Auto">تلقائي (حسب أسبقية التسجيل)</option>
                <option value="Manual">يدوي (يتطلب موافقة الإدارة)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النقاط المكتسبة للحضور</label>
              <input required type="number" min="0" name="points" value={formData.points} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center">
                <input type="checkbox" id="hasCertificate" name="hasCertificate" checked={formData.hasCertificate} onChange={handleChange} className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" />
                <label htmlFor="hasCertificate" className="ms-2 block text-sm font-medium text-gray-700">
                  إصدار شهادات حضور تلقائية
                </label>
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="requiresRegistration" 
                  name="requiresRegistration" 
                  checked={formData.requiresRegistration} 
                  onChange={handleChange} 
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" 
                />
                <label htmlFor="requiresRegistration" className="ms-2 block text-sm font-medium text-gray-700">
                  يتطلب تسجيلاً مسبقاً (ألغِ التحديد للبوثات والزيارات المباشرة بدون تسجيل)
                </label>
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="isUnlisted" 
                  name="isUnlisted" 
                  checked={formData.isUnlisted} 
                  onChange={handleChange} 
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded" 
                />
                <label htmlFor="isUnlisted" className="ms-2 block text-sm font-medium text-gray-700">
                  إخفاء الفعالية من القائمة العامة (تظل جارية ومتاحة عبر الرابط المباشر أو الـ QR فقط)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Extra Details */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 font-cairo border-b pb-2">تفاصيل إضافية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المكتسبات (عربي - سطر لكل نقطة)</label>
              <textarea name="gains" rows={4} value={formData.gains} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="التعرف على أساسيات...&#10;بناء مشروع..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gains (English - One per line)</label>
              <textarea name="gainsEn" rows={4} value={formData.gainsEn} onChange={handleChange} dir="ltr" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">المتحدثون (مفصولون بفاصلة)</label>
              <input type="text" name="speakers" value={formData.speakers} onChange={handleChange} placeholder="أحمد محمد, سارة خالد" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عدد المسجلين (للتعديل اليدوي)</label>
              <input type="number" name="registeredCount" value={formData.registeredCount} readOnly aria-label="إجمالي الحجوزات — محسوب تلقائيًا" className="w-full border-gray-300 bg-gray-100 rounded-lg shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عدد الحضور الفعلي (بعد انتهاء الفعالية)</label>
              <input type="number" name="attendanceCount" value={attendanceCount} readOnly aria-label="إجمالي الحضور — محسوب تلقائيًا" className="w-full border-gray-300 bg-gray-100 rounded-lg shadow-sm" />
            </div>
          </div>
        </div>

        {/* Section 5: Custom Feedback Questions */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-cairo flex items-center gap-2">
                <span>أسئلة التقييم والانطباع عند التحضير ⭐</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تظهر هذه الأسئلة للمشترك فور مسح رمز QR أو رابط التحضير لتسجيل الحضور والحصول على النقاط.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBankOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Archive className="w-4 h-4 text-indigo-600" />
                <span>أرشيف الأسئلة ({bankCount})</span>
              </button>
              <button
                type="button"
                onClick={addFeedbackQuestion}
                className="bg-purple-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سؤال</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {feedbackQuestions.map((q, idx) => (
              <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-400">سؤال #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveQuestionToBank(q)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      title="حفظ هذا السؤال في الأرشيف لاستخدامه في فعاليات أخرى"
                    >
                      {savedSuccessId === q.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">تم الحفظ!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                          <span>حفظ بالأرشيف</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFeedbackQuestion(q.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">نص السؤال</label>
                    <input
                      type="text"
                      value={q.title}
                      onChange={(e) => updateFeedbackQuestion(q.id, 'title', e.target.value)}
                      placeholder="مثال: كيف تقيم جودة محتوى الفعالية؟"
                      className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإجابة</label>
                    <select
                      value={q.type}
                      onChange={(e) => updateFeedbackQuestion(q.id, 'type', e.target.value as 'choice' | 'text')}
                      className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="choice">خيارات سريعة (Pill Buttons)</option>
                      <option value="text">نص حر مع اقتراحات</option>
                    </select>
                  </div>
                </div>

                {q.type === 'choice' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الخيارات (مفصولة بفاصلة)</label>
                    <input
                      type="text"
                      value={(q.options || []).join(', ')}
                      onChange={(e) => updateFeedbackQuestion(q.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="ممتاز, جيد جداً, مناسب"
                      className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}

                {q.type === 'text' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اقتراحات الكتابة السريعة (مفصولة بفاصلة)</label>
                    <input
                      type="text"
                      value={(q.quickChips || []).join(', ')}
                      onChange={(e) => updateFeedbackQuestion(q.id, 'quickChips', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="محتوى ممتاز, تطبيق رائع, شكراً لكم"
                      className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id={`req_${q.id}`}
                    checked={q.required || false}
                    onChange={(e) => updateFeedbackQuestion(q.id, 'required', e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`req_${q.id}`} className="text-xs font-bold text-slate-700">
                    إجابة إجبارية عند التحضير
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center shadow-md disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : (
              <>
                <Save className="me-2 h-5 w-5" />
                حفظ كمسودة
              </>
            )}
          </button>
        </div>
      </form>

      {/* Survey Question Bank Modal */}
      <QuestionBankModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        onImportQuestion={handleImportQuestion}
        currentEventQuestions={feedbackQuestions}
      />

      {/* Custom Event Templates Modal */}
      <EventTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        currentFormData={formData}
        currentQuestions={feedbackQuestions}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { httpsCallable } from '@/lib/backend';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  FileText, 
  Layers, 
  Monitor, 
  Check, 
  Lock, 
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Users,
  Cpu
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { 
  ShowcaseCategory, 
  ShowcaseEquipment, 
  ShowcasePresentationMethod, 
  ShowcaseStage 
} from '@/lib/types';

interface ExistingSubmission {
  alreadySubmitted: boolean;
  referenceNumber: string;
  status: string;
  applicationId?: string;
}

const CATEGORIES: { id: ShowcaseCategory; titleAr: string; titleEn: string; descAr: string }[] = [
  { id: 'electronics_iot', titleAr: 'الإلكترونيات وإنترنت الأشياء (IoT)', titleEn: 'Electronics & IoT', descAr: 'أنظمة مدمجة، دوائر إلكترونية، مجسات وأجهزة ذكية' },
  { id: 'robotics', titleAr: 'الروبوتات والأتمتة', titleEn: 'Robotics', descAr: 'أنظمة تحكم آلية، أذرع روبوتية، مركبات ذاتية القيادة' },
  { id: 'ai_data', titleAr: 'الذكاء الاصطناعي والبيانات', titleEn: 'AI & Data', descAr: 'نماذج تعلم الآلة، الرؤية الحاسوبية، وتطبيقات الذكاء الاصطناعي' },
  { id: 'software_dev', titleAr: 'تطوير البرمجيات والحلول الرقمية', titleEn: 'Software Development', descAr: 'تطبيقات الويب والجوال، المنصات الرقمية، وأنظمة السحابة' },
  { id: 'energy_sustainability', titleAr: 'الطاقة والاستدامة', titleEn: 'Energy & Sustainability', descAr: 'طاقة متجددة، ترشيد استهلاك، وحلول بيئية وهندسية' },
  { id: 'other_engineering', titleAr: 'مشاريع هندسية وتقنية أخرى', titleEn: 'Other Engineering Projects', descAr: 'ابتكارات هندسية متعددة التخصصات ونماذج تطبيقية' },
];

const STAGES: { id: ShowcaseStage; titleAr: string; titleEn: string }[] = [
  { id: 'working_project', titleAr: 'مشروع متكامل ويعمل بالكامل', titleEn: 'Working Project' },
  { id: 'functional_prototype', titleAr: 'نموذج أولي تجريبي (Prototype)', titleEn: 'Functional Prototype' },
  { id: 'simulation_software', titleAr: 'محاكاة أو برمجية قابلة للاستعراض الحي', titleEn: 'Demonstrable Simulation / Software' },
];

const METHODS: { id: ShowcasePresentationMethod; titleAr: string; titleEn: string }[] = [
  { id: 'physical_prototype', titleAr: 'مجسم / جهاز فيزيائي ملموس', titleEn: 'Physical Prototype' },
  { id: 'laptop_demo', titleAr: 'عرض حي عبر لابتوب / شاشة الحاسب', titleEn: 'Laptop / Software Demo' },
  { id: 'poster_presentation', titleAr: 'بوستر هندسي وعرض تقديمي', titleEn: 'Poster / Presentation' },
];

const EQUIPMENT_OPTIONS: { id: ShowcaseEquipment; labelAr: string; labelEn: string }[] = [
  { id: 'table', labelAr: 'طاولة عرض', labelEn: 'Table' },
  { id: 'electricity', labelAr: 'مقبس كهربائي (فيش)', labelEn: 'Electricity' },
  { id: 'display_screen', labelAr: 'شاشة عرض خارجية', labelEn: 'Display Screen' },
  { id: 'additional_space', labelAr: 'مساحة إضافية لتجربة النموذج', labelEn: 'Additional Space' },
  { id: 'no_special_requirements', labelAr: 'لا توجد متطلبات خاصة', labelEn: 'No Special Requirements' },
];

export default function ShowcaseApplicationPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, userData, loading: authLoading, login } = useAuth();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [organization, setOrganization] = useState('');
  
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState<ShowcaseCategory>('electronics_iot');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<ShowcaseStage>('working_project');
  const [mediaUrl, setMediaUrl] = useState('');

  const [presentationMethod, setPresentationMethod] = useState<ShowcasePresentationMethod>('physical_prototype');
  const [equipment, setEquipment] = useState<ShowcaseEquipment[]>(['table', 'electricity']);
  const [teamSize, setTeamSize] = useState<number>(2);
  const [availability, setAvailability] = useState<'yes' | 'no'>('yes');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Submission & Validation State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<ExistingSubmission | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Auto-prefill authenticated user details once available
  useEffect(() => {
    if (user && userData) {
      if (!fullName) {
        setFullName(userData.arabicFullName || userData.displayName || user.displayName || '');
      }
      if (!email) {
        setEmail(user.email || userData.email || '');
      }
      if (!organization) {
        const orgParts = [userData.college, userData.major].filter(Boolean).join(' - ');
        setOrganization(orgParts || (userData.isQassimStudent ? 'جامعة القصيم' : ''));
      }
    }
  }, [user, userData, fullName, email, organization]);

  // Check if current user already applied for IEEE Day 2026 showcase
  useEffect(() => {
    if (!user) return;
    let active = true;
    const checkSubmissions = async () => {
      setCheckingExisting(true);
      try {
        const res = await httpsCallable<unknown, { applications?: Array<{ referenceNumber: string; status: string; id: string }> }>(
          null, 
          'getShowcaseApplications'
        )({ eventId: 'ieee-day-2026' });

        if (active && res.data.applications && res.data.applications.length > 0) {
          const app = res.data.applications[0];
          setExistingSubmission({
            alreadySubmitted: true,
            referenceNumber: app.referenceNumber,
            status: app.status,
            applicationId: app.id
          });
        }
      } catch (err) {
        // Silently catch in case endpoint is restricted or fresh
        console.error('Check existing error:', err);
      } finally {
        if (active) setCheckingExisting(false);
      }
    };
    checkSubmissions();
    return () => { active = false; };
  }, [user]);

  const toggleEquipment = (id: ShowcaseEquipment) => {
    if (id === 'no_special_requirements') {
      setEquipment(['no_special_requirements']);
      return;
    }
    setEquipment(prev => {
      const filtered = prev.filter(item => item !== 'no_special_requirements');
      if (filtered.includes(id)) {
        const next = filtered.filter(item => item !== id);
        return next.length > 0 ? next : ['no_special_requirements'];
      } else {
        return [...filtered, id];
      }
    });
  };

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError(isAr ? 'يرجى تسجيل الدخول أولاً لإرسال طلبك.' : 'Please sign in first to submit your application.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError(isAr ? 'الاسم الكامل مطلوب.' : 'Full name is required.');
      return;
    }
    if (!email.trim()) {
      setSubmitError(isAr ? 'البريد الإلكتروني مطلوب.' : 'Email is required.');
      return;
    }
    if (!whatsapp.trim()) {
      setSubmitError(isAr ? 'رقم الواتساب مطلوب للتواصل والتنسيق.' : 'WhatsApp number is required.');
      return;
    }
    if (!organization.trim()) {
      setSubmitError(isAr ? 'الجامعة أو الجهة التابع لها مطلوبة.' : 'University/Organization is required.');
      return;
    }
    if (!projectName.trim()) {
      setSubmitError(isAr ? 'اسم المشروع مطلوب.' : 'Project name is required.');
      return;
    }
    if (!description.trim() || description.length < 20) {
      setSubmitError(isAr ? 'يرجى كتابة وصف موجز للمشروع وفكرته (50-100 كلمة تقريباً).' : 'Please provide a project description (50-100 words).');
      return;
    }
    if (availability !== 'yes') {
      setSubmitError(isAr ? 'يجب الالتزام بالحضور وجاهزية استعراض المشروع للمشاركة في المعرض.' : 'You must be available to present the project at the event.');
      return;
    }
    if (!agreedToTerms) {
      setSubmitError(isAr ? 'يجب الإقرار بصحة المعلومات والالتزام بالحضور.' : 'Please accept the declaration terms.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await httpsCallable<unknown, { success?: boolean; alreadySubmitted?: boolean; referenceNumber: string; status: string }>(
        null,
        'submitShowcaseApplication'
      )({
        eventId: 'ieee-day-2026',
        fullName: fullName.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        organization: organization.trim(),
        projectName: projectName.trim(),
        category,
        description: description.trim(),
        stage,
        mediaUrl: mediaUrl.trim() || undefined,
        presentationMethod,
        equipment,
        teamSize,
        availability: true,
        agreedToTerms: true
      });

      if (res.data.alreadySubmitted) {
        setExistingSubmission({
          alreadySubmitted: true,
          referenceNumber: res.data.referenceNumber,
          status: res.data.status
        });
      } else {
        setSuccessRef(res.data.referenceNumber);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : (isAr ? 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.' : 'An error occurred while submitting your application.'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1 rounded-xl text-xs">{isAr ? 'تم قبول المشروع ⚡️' : 'Accepted'}</span>;
      case 'rejected':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-3 py-1 rounded-xl text-xs">{isAr ? 'نعتذر، لم يتم الاختيار' : 'Not Selected'}</span>;
      case 'waitlisted':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-3 py-1 rounded-xl text-xs">{isAr ? 'في قائمة الانتظار' : 'Waitlisted'}</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 font-bold px-3 py-1 rounded-xl text-xs">{isAr ? 'قيد المراجعة والفرز' : 'Under Review'}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 mt-14" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Back Link */}
        <div>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isAr ? 'العودة للفعاليات' : 'Back to Events'}</span>
          </Link>
        </div>

        {/* Page Header Card */}
        <header className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-[2.5rem] p-6 sm:p-10 text-white shadow-xl overflow-hidden border border-white/10">
          <div className="absolute top-0 end-0 -mt-10 -me-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 start-0 -mb-10 -ms-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IEEE Day 2026</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-cairo leading-tight">
              {isAr ? 'التقديم لمعرض المشاريع | IEEE Day 2026' : 'Projects Showcase Application | IEEE Day 2026'}
            </h1>

            <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-3 font-medium">
              <p>
                {isAr ? 'عندك مشروع هندسي أو تقني ودك تعرضه للناس؟ ⚡️' : 'Do you have an engineering or technical project you want to showcase? ⚡️'}
              </p>
              <p className="text-slate-300">
                {isAr ? 'شاركنا مشروعك ضمن معرض IEEE Day، واستعرض فكرتك وتجربتك أمام المهتمين بالهندسة والتقنية!' : 'Share your project in the IEEE Day Showcase and present your idea and prototype to engineering enthusiasts!'}
              </p>
              <p className="text-amber-300 text-xs sm:text-sm font-semibold">
                {isAr ? 'المساحات محدودة، وسيتم اختيار المشاريع المشاركة بعد مراجعة الطلبات.' : 'Exhibition slots are limited. Selected projects will be contacted after review.'}
              </p>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/15">
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/10">
                <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'التاريخ' : 'Date'}</span>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    {isAr ? 'الجمعة، 16 أكتوبر 2026' : 'Friday, Oct 16, 2026'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/10">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'المكان' : 'Location'}</span>
                  <span className="text-xs sm:text-sm font-bold text-white block truncate">
                    {isAr ? 'بيت الثقافة – بريدة' : 'Culture House – Buraidah'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 border border-white/10">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'فترات المعرض' : 'Exhibition Time'}</span>
                  <span className="text-xs font-bold text-white block leading-tight">
                    {isAr ? '6:30–8:00 م و 9:30–10:00 م' : '6:30–8:00 PM & 9:30–10:00 PM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Existing Submission Notice */}
        {existingSubmission && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-cairo text-slate-900">
                    {isAr ? 'لديك طلب مشاركة مسجل مسبقاً' : 'You already have an active submission'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {isAr ? 'رقم مرجع الطلب:' : 'Reference number:'} <strong className="font-mono text-blue-700">{existingSubmission.referenceNumber}</strong>
                  </p>
                </div>
              </div>
              <div>{statusBadge(existingSubmission.status)}</div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {isAr ? 'تم استلام طلبك لمعرض IEEE Day 2026 بنجاح وهو قيد الفرز من قبل اللجنة المنظمة. سيتم إشعارك والتواصل معك عبر الواتساب والبريد فور انتهاء المراجعة.' : 'Your application for IEEE Day 2026 Showcase has been received and is being reviewed. The organizing team will reach out via WhatsApp/Email.'}
            </p>
          </div>
        )}

        {/* Submission Success View */}
        {successRef && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {isAr ? 'وصلنا طلب مشاركتك! ⚡️' : 'Application Received! ⚡️'}
              </h2>
              <div className="text-slate-700 text-sm sm:text-base leading-relaxed max-w-lg mx-auto space-y-1">
                <p className="font-bold">{isAr ? 'شكرًا لتقديم مشروعك لمعرض IEEE Day.' : 'Thank you for submitting your project to the IEEE Day Showcase.'}</p>
                <p className="text-slate-600">{isAr ? 'بنراجع المشاريع المقدمة ونتواصل مع أصحاب المشاريع المختارة قريبًا.' : 'We are reviewing submissions and will contact the selected teams soon.'}</p>
              </div>
            </div>

            <div className="inline-block bg-white rounded-2xl px-6 py-4 border border-emerald-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">{isAr ? 'رقم مرجع الطلب الخاص بك' : 'Your Reference Number'}</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-wider">{successRef}</span>
            </div>

            <div className="pt-2">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
              >
                <span>{isAr ? 'العودة لصفحة الفعاليات' : 'Return to Events'}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Form View (when not yet submitted or not showing success) */}
        {!existingSubmission && !successRef && (
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Auth Gate Banner (Prompt user to sign in if not authenticated) */}
            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-900">
                  <Lock className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold font-cairo">
                      {isAr ? 'سجّل دخولك لحفظ طلبك ومتابعة حالته' : 'Sign in to track your application'}
                    </h4>
                    <p className="text-xs text-amber-700">
                      {isAr ? 'تعبئة البيانات تلقائياً وربط طلبك بحسابك في المنصة.' : 'Auto-prefill your info and link the submission to your IEEE profile.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={login}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  {isAr ? 'تسجيل الدخول الآن' : 'Sign In Now'}
                </button>
              </div>
            )}

            {/* Section A: Applicant Information */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-black">
                  A
                </div>
                <div>
                  <h2 className="text-lg font-black font-cairo text-slate-900">
                    {isAr ? 'القسم الأول: معلومات مقدم الطلب' : 'Section A — Applicant Information'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'معلومات التواصل الأساسية الخاصة بك' : 'Your primary contact details'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isAr ? 'مثال: بدر العبداللطيف' : 'e.g. John Doe'}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'رقم الواتساب للتواصل *' : 'WhatsApp Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'الجامعة / الكلية / الجهة *' : 'University / Organization *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder={isAr ? 'مثال: جامعة القصيم - كلية الهندسة' : 'e.g. Qassim University'}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Section B: Project Information */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-black">
                  B
                </div>
                <div>
                  <h2 className="text-lg font-black font-cairo text-slate-900">
                    {isAr ? 'القسم الثاني: تفاصيل المشروع' : 'Section B — Project Information'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'فكرة المشروع، مجاله ومرحلة تطوره الحالية' : 'Project concept, category and development stage'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'اسم المشروع *' : 'Project Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={isAr ? 'مثال: نظام المراقبة الذكي للري بالطاقة الشمسية' : 'e.g. Smart Solar Irrigation System'}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'مسار وتصنيف المشروع *' : 'Project Category *'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer ${
                          category === cat.id
                            ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-black ${category === cat.id ? 'text-purple-900' : 'text-slate-800'}`}>
                            {isAr ? cat.titleAr : cat.titleEn}
                          </span>
                          {category === cat.id && <Check className="w-4 h-4 text-purple-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          {cat.descAr}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {isAr ? 'وصف المشروع (الفكرة، المشكلة والحل) *' : 'Project Description *'}
                    </label>
                    <span className={`text-[11px] font-bold ${wordCount >= 40 && wordCount <= 120 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {wordCount} {isAr ? 'كلمة (الموصى به: 50-100 كلمة)' : 'words (recommended 50-100)'}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isAr ? 'اشرح باختصار: ما المشكلة التي يحلها المشروع؟ ما هي التقنيات المستخدمة والنتائج التي تم التوصل إليها؟' : 'Explain the idea, problem and engineering solution...'}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl p-4 text-sm text-slate-900 focus:outline-hidden transition-all leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'مرحلة تطوير المشروع الحالية *' : 'Project Development Stage *'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {STAGES.map(st => (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => setStage(st.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          stage === st.id
                            ? 'bg-purple-600 border-purple-600 text-white font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium'
                        }`}
                      >
                        <span className="text-xs">
                          {isAr ? st.titleAr : st.titleEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? 'رابط وسائط أو توثيق المشروع (اختياري)' : 'Project Media Link (Optional)'}
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-2">
                    {isAr ? 'رابط Google Drive، GitHub، فيديو YouTube، أو أي رابط يوضح عمل المشروع' : 'Google Drive, GitHub, YouTube demo, or accessible link'}
                  </span>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </section>

            {/* Section C: Exhibition Requirements */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-black">
                  C
                </div>
                <div>
                  <h2 className="text-lg font-black font-cairo text-slate-900">
                    {isAr ? 'القسم الثالث: متطلبات العرض والتنظيم' : 'Section C — Exhibition Requirements'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'تجهيزات موقع المعرض والحضور' : 'Logistics, required equipment and presence'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'طريقة استعراض المشروع في المعرض *' : 'Presentation Method *'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {METHODS.map(m => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPresentationMethod(m.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          presentationMethod === m.id
                            ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium'
                        }`}
                      >
                        <span className="text-xs">
                          {isAr ? m.titleAr : m.titleEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {isAr ? 'التجهيزات المطلوبة لطاولتك / ركنك (تحديد متعدد) *' : 'Required Equipment (Select all that apply) *'}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {EQUIPMENT_OPTIONS.map(eq => {
                      const selected = equipment.includes(eq.id);
                      return (
                        <button
                          type="button"
                          key={eq.id}
                          onClick={() => toggleEquipment(eq.id)}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            selected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                            selected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {selected && <Check className="w-3 h-3" />}
                          </div>
                          <span>{isAr ? eq.labelAr : eq.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {isAr ? 'عدد أعضاء الفريق الحاضرين في المعرض *' : 'Team Members Attending *'}
                    </label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-hidden transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>
                          {num} {isAr ? (num === 1 ? 'عضو' : num === 2 ? 'عضوان' : 'أعضاء') : (num === 1 ? 'member' : 'members')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {isAr ? 'الجاهزية والالتزام بالحضور واستعراض المشروع *' : 'Available to Present the Project *'}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAvailability('yes')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                          availability === 'yes'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isAr ? 'نعم، ملتزم بالحضور' : 'Yes, Available'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailability('no')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                          availability === 'no'
                            ? 'bg-rose-600 border-rose-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isAr ? 'غير مؤكد' : 'No / Uncertain'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Agreement Box */}
            <div className="bg-slate-100/90 rounded-2xl p-5 border border-slate-200/80">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                  {isAr 
                    ? 'أؤكد صحة المعلومات المقدمة، وألتزم بالحضور وتجهيز المشروع في حال قبوله، وأعلم أن إرسال الطلب لا يعني القبول النهائي.'
                    : 'I confirm the information is accurate, commit to attend and prepare the project if selected, and acknowledge that submitting this form does not imply final acceptance.'}
                </span>
              </label>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white py-4 px-8 rounded-2xl font-bold font-cairo text-base sm:text-lg shadow-xl shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" color="border-white" />
                    <span>{isAr ? 'جارٍ إرسال الطلب...' : 'Submitting Application...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{isAr ? 'إرسال طلب المشاركة في المعرض ⚡️' : 'Submit Showcase Application ⚡️'}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { 
  Rocket, 
  Search, 
  Filter, 
  Download, 
  Settings, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Users,
  Layers,
  ChevronDown,
  X,
  FileSpreadsheet,
  Cpu,
  Monitor,
  Zap,
  Check,
  Trash2
} from 'lucide-react';
import { AdminError, AdminLoading, formatAdminDate, useAdminQuery } from '@/components/admin/AdminData';
import { httpsCallable } from '@/lib/backend';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { 
  ShowcaseApplication, 
  ShowcaseCategory, 
  ShowcaseEquipment, 
  ShowcaseSettings, 
  ShowcaseStatus 
} from '@/lib/types';

interface ShowcaseOverviewData {
  applications: ShowcaseApplication[];
  settings: ShowcaseSettings;
  stats: {
    total: number;
    accepted: number;
    pending: number;
    waitlisted: number;
    rejected: number;
    capacity: number;
    remainingSlots: number;
  };
}

const CATEGORY_LABELS: Record<ShowcaseCategory, { ar: string; en: string }> = {
  electronics_iot: { ar: 'الإلكترونيات وإنترنت الأشياء (IoT)', en: 'Electronics & IoT' },
  robotics: { ar: 'الروبوتات والأتمتة', en: 'Robotics' },
  ai_data: { ar: 'الذكاء الاصطناعي والبيانات', en: 'AI & Data' },
  software_dev: { ar: 'تطوير البرمجيات', en: 'Software Development' },
  energy_sustainability: { ar: 'الطاقة والاستدامة', en: 'Energy & Sustainability' },
  other_engineering: { ar: 'مشاريع هندسية أخرى', en: 'Other Engineering' }
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  working_project: { ar: 'مشروع متكامل ويعمل', en: 'Working Project' },
  functional_prototype: { ar: 'نموذج أولي تجريبي (Prototype)', en: 'Functional Prototype' },
  simulation_software: { ar: 'محاكاة أو برمجية قابلة للعرض', en: 'Demonstrable Simulation' }
};

const METHOD_LABELS: Record<string, { ar: string; en: string }> = {
  physical_prototype: { ar: 'مجسم / جهاز فيزيائي', en: 'Physical Prototype' },
  laptop_demo: { ar: 'عرض حي عبر حاسب محمول', en: 'Laptop / Demo' },
  poster_presentation: { ar: 'بوستر هندسي', en: 'Poster' }
};

const EQUIPMENT_LABELS: Record<ShowcaseEquipment, { ar: string; en: string }> = {
  table: { ar: 'طاولة', en: 'Table' },
  electricity: { ar: 'كهرباء', en: 'Electricity' },
  display_screen: { ar: 'شاشة عرض', en: 'Screen' },
  additional_space: { ar: 'مساحة إضافية', en: 'Extra Space' },
  no_special_requirements: { ar: 'بدون متطلبات', en: 'None' }
};

export default function AdminShowcasePage() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const { data, loading, error, refresh } = useAdminQuery<ShowcaseOverviewData>('getShowcaseApplications');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ShowcaseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ShowcaseCategory>('all');

  // Modal State
  const [selectedApp, setSelectedApp] = useState<ShowcaseApplication | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewingStatus, setReviewingStatus] = useState<ShowcaseStatus | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Settings State
  const [newCapacity, setNewCapacity] = useState<number>(15);
  const [newOpenStatus, setNewOpenStatus] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    if (!data?.applications) return [];
    return data.applications.filter(app => {
      const matchesSearch = 
        !searchQuery.trim() ||
        app.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.organization.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || app.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [data?.applications, searchQuery, statusFilter, categoryFilter]);

  const handleOpenDetail = (app: ShowcaseApplication) => {
    setSelectedApp(app);
    setReviewNotes(app.adminNotes || '');
    setActionError(null);
  };

  const handleStatusChange = async (targetStatus: ShowcaseStatus) => {
    if (!selectedApp) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await httpsCallable(null, 'reviewShowcaseApplication')({
        applicationId: selectedApp.id,
        status: targetStatus,
        adminNotes: reviewNotes.trim()
      });
      refresh();
      setSelectedApp(prev => prev ? { ...prev, status: targetStatus, adminNotes: reviewNotes.trim() } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : (isAr ? 'فشلت العملية' : 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    const confirmMessage = isAr 
      ? `هل أنت متأكد من رغبتك في حذف طلب "${selectedApp.projectName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Are you sure you want to permanently delete application "${selectedApp.projectName}"? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await httpsCallable(null, 'deleteShowcaseApplication')({
        applicationId: selectedApp.id
      });
      setSelectedApp(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : (isAr ? 'فشل حذف الطلب' : 'Failed to delete application'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await httpsCallable(null, 'saveShowcaseSettings')({
        maxAcceptedProjects: Number(newCapacity),
        applicationsOpen: newOpenStatus
      });
      refresh();
      setSettingsOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const exportToCSV = () => {
    if (!data?.applications || !data.applications.length) return;
    
    const headers = [
      'Reference',
      'Project Name',
      'Applicant Name',
      'Email',
      'WhatsApp',
      'Organization',
      'Category',
      'Stage',
      'Presentation Method',
      'Equipment',
      'Team Size',
      'Status',
      'Admin Notes',
      'Media URL',
      'Submitted At'
    ];

    const rows = data.applications.map(app => [
      `"${app.referenceNumber}"`,
      `"${app.projectName.replace(/"/g, '""')}"`,
      `"${app.fullName.replace(/"/g, '""')}"`,
      `"${app.email}"`,
      `"${app.whatsapp}"`,
      `"${app.organization.replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[app.category]?.[isAr ? 'ar' : 'en'] || app.category}"`,
      `"${STAGE_LABELS[app.stage]?.[isAr ? 'ar' : 'en'] || app.stage}"`,
      `"${METHOD_LABELS[app.presentationMethod]?.[isAr ? 'ar' : 'en'] || app.presentationMethod}"`,
      `"${app.equipment?.map(e => EQUIPMENT_LABELS[e]?.[isAr ? 'ar' : 'en'] || e).join('; ') || ''}"`,
      app.teamSize,
      app.status,
      `"${(app.adminNotes || '').replace(/"/g, '""')}"`,
      `"${app.mediaUrl || ''}"`,
      `"${app.createdAt}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ieee_day_showcase_projects_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusBadge = (status: ShowcaseStatus) => {
    switch (status) {
      case 'accepted':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-xl">{isAr ? 'مقبول' : 'Accepted'}</span>;
      case 'rejected':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-xl">{isAr ? 'مرفوض' : 'Rejected'}</span>;
      case 'waitlisted':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-xl">{isAr ? 'انتظار' : 'Waitlisted'}</span>;
      case 'withdrawn':
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold px-2.5 py-1 rounded-xl">{isAr ? 'منسحب' : 'Withdrawn'}</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-xl">{isAr ? 'قيد المراجعة' : 'Pending'}</span>;
    }
  };

  return (
    <div className="space-y-7" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-purple-600">IEEE Day 2026</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full">
              {isAr ? 'معرض المشاريع التقنية' : 'Projects Showcase'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black font-cairo text-slate-900">
            {isAr ? 'إدارة معرض المشاريع' : 'Showcase Projects Management'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {isAr ? 'فرز وقبول المشاريع الهندسية المشاركة في معرض IEEE Day، ومتابعة متطلبات التجهيز والسعة.' : 'Review and manage engineering projects submitted for IEEE Day showcase.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (data?.settings) {
                setNewCapacity(data.settings.maxAcceptedProjects);
                setNewOpenStatus(data.settings.applicationsOpen);
              }
              setSettingsOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <Settings size={16} />
            <span>{isAr ? 'إعدادات المعرض' : 'Showcase Settings'}</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            disabled={!data?.applications?.length}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={16} />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {error ? (
        <AdminError message={error} retry={refresh} />
      ) : loading && !data ? (
        <AdminLoading />
      ) : data ? (
        <>
          {/* Stats Metrics Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-xs text-slate-500 font-bold block">{isAr ? 'إجمالي الطلبات' : 'Total Applications'}</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{data.stats.total}</span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-bold block">{isAr ? 'المشاريع المقبولة' : 'Accepted'}</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {data.stats.accepted}/{data.stats.capacity}
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">{data.stats.accepted}</span>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-2xs">
              <span className="text-xs text-blue-700 font-bold block">{isAr ? 'بانتظار الفرز' : 'Pending Review'}</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">{data.stats.pending}</span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
              <span className="text-xs text-amber-700 font-bold block">{isAr ? 'قائمة الانتظار' : 'Waitlisted'}</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">{data.stats.waitlisted}</span>
            </div>

            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs col-span-2 lg:col-span-1">
              <span className="text-xs text-purple-700 font-bold block">{isAr ? 'المساحات الشاغرة' : 'Available Slots'}</span>
              <span className="text-2xl font-black text-purple-900 mt-1 block">
                {data.stats.remainingSlots} {isAr ? 'طاولة' : 'slots'}
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث باسم المشروع، صاحب الطلب، المرجع، أو الجامعة...' : 'Search project, applicant, ref or organization...'}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl ps-10 pe-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-hidden transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">{isAr ? 'جميع المسارات والتصنيفات' : 'All Categories'}</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{isAr ? label.ar : label.en}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="pending">{isAr ? 'قيد المراجعة' : 'Pending'}</option>
                  <option value="accepted">{isAr ? 'مقبول' : 'Accepted'}</option>
                  <option value="waitlisted">{isAr ? 'قائمة انتظار' : 'Waitlisted'}</option>
                  <option value="rejected">{isAr ? 'مرفوض' : 'Rejected'}</option>
                  <option value="withdrawn">{isAr ? 'منسحب' : 'Withdrawn'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-start">{isAr ? 'المرجع والمشروع' : 'Reference & Project'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'مقدم الطلب والجهة' : 'Applicant'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'المسار والمرحلة' : 'Category'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'طريقة العرض والتجهيز' : 'Requirements'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-purple-700 font-bold">{app.referenceNumber}</div>
                        <div className="font-black text-slate-900 line-clamp-1">{app.projectName}</div>
                        {app.mediaUrl && (
                          <a 
                            href={app.mediaUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                          >
                            <ExternalLink size={11} />
                            <span>{isAr ? 'رابط الوسائط' : 'Media Link'}</span>
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{app.fullName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{app.organization}</div>
                        <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{app.whatsapp}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-lg mb-1">
                          {CATEGORY_LABELS[app.category]?.[isAr ? 'ar' : 'en'] || app.category}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {STAGE_LABELS[app.stage]?.[isAr ? 'ar' : 'en'] || app.stage}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px] font-bold text-slate-800">
                          {METHOD_LABELS[app.presentationMethod]?.[isAr ? 'ar' : 'en'] || app.presentationMethod}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.equipment?.map(e => EQUIPMENT_LABELS[e]?.[isAr ? 'ar' : 'en'] || e).join('، ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isAr ? `فريق: ${app.teamSize} أفراد` : `Team: ${app.teamSize}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {statusBadge(app.status)}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors cursor-pointer border border-purple-200"
                        >
                          <Eye size={13} />
                          <span>{isAr ? 'مراجعة' : 'Review'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredApps.length && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {isAr ? 'لا توجد طلبات مشاركة تطابق هذا البحث أو الفلتر.' : 'No submissions found matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Review & Detail Modal */}
      {selectedApp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setSelectedApp(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-purple-400 font-bold">{selectedApp.referenceNumber}</span>
                  <span className="text-slate-500">·</span>
                  {statusBadge(selectedApp.status)}
                </div>
                <h3 className="text-lg sm:text-xl font-black font-cairo text-white mt-1">
                  {selectedApp.projectName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Scroll */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm">
              
              {/* Applicant Info Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'معلومات مقدم الطلب' : 'Applicant'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الاسم:' : 'Name:'}</span>
                    <strong className="text-slate-900">{selectedApp.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الجهة:' : 'Organization:'}</span>
                    <strong className="text-slate-900">{selectedApp.organization}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'البريد:' : 'Email:'}</span>
                    <strong className="text-slate-900 font-mono">{selectedApp.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'الواتساب:' : 'WhatsApp:'}</span>
                    <strong className="text-slate-900 font-mono" dir="ltr">{selectedApp.whatsapp}</strong>
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase">{isAr ? 'وصف المشروع' : 'Description'}</h4>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedApp.description}
                </div>
              </div>

              {/* Technical & Logistics Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-slate-400 block mb-1">{isAr ? 'التصنيف' : 'Category'}</span>
                  <strong className="text-slate-900 block">{CATEGORY_LABELS[selectedApp.category]?.[isAr ? 'ar' : 'en']}</strong>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-slate-400 block mb-1">{isAr ? 'المرحلة' : 'Stage'}</span>
                  <strong className="text-slate-900 block">{STAGE_LABELS[selectedApp.stage]?.[isAr ? 'ar' : 'en']}</strong>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-slate-400 block mb-1">{isAr ? 'طريقة العرض' : 'Method'}</span>
                  <strong className="text-slate-900 block">{METHOD_LABELS[selectedApp.presentationMethod]?.[isAr ? 'ar' : 'en']}</strong>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 col-span-2 sm:col-span-2">
                  <span className="text-slate-400 block mb-1">{isAr ? 'التجهيزات المطلوبة' : 'Equipment'}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedApp.equipment?.map(eq => (
                      <span key={eq} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                        {EQUIPMENT_LABELS[eq]?.[isAr ? 'ar' : 'en'] || eq}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <span className="text-slate-400 block mb-1">{isAr ? 'أعضاء الفريق' : 'Team Members'}</span>
                  <strong className="text-slate-900 block">{selectedApp.teamSize} {isAr ? 'أفراد' : 'attendees'}</strong>
                </div>
              </div>

              {/* Media Link */}
              {selectedApp.mediaUrl && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-blue-900">{isAr ? 'رابط ملفات ومشاهدة المشروع:' : 'Media Link:'}</span>
                  <a
                    href={selectedApp.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span>{isAr ? 'فتح الرابط الخارجي' : 'Open Link'}</span>
                  </a>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {isAr ? 'ملاحظات اللجنة والتحكيم الداخلية (خاصة بالمنظمين):' : 'Internal Review Notes (Admin only):'}
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={isAr ? 'أضف ملاحظات التقييم أو متطلبات خاصة للتواصل...' : 'Add notes on evaluation or special logistics...'}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-hidden transition-all"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {actionError}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {isAr ? 'تاريخ التقديم:' : 'Submitted:'} {formatAdminDate(selectedApp.createdAt as any, locale)}
                </span>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeleteApplication}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  title={isAr ? 'حذف الطلب نهائياً' : 'Delete Application'}
                >
                  <Trash2 size={13} />
                  <span>{isAr ? 'حذف الطلب' : 'Delete'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('rejected')}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAr ? 'رفض' : 'Reject'}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('waitlisted')}
                  className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAr ? 'قائمة انتظار' : 'Waitlist'}
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('accepted')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {actionLoading ? <LoadingSpinner size="sm" color="border-white" /> : <Check size={14} />}
                  <span>{isAr ? 'قبول في المعرض' : 'Accept Project'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-cairo text-slate-900">
                {isAr ? 'إعدادات وسعة معرض المشاريع' : 'Showcase Settings & Capacity'}
              </h3>
              <button 
                type="button" 
                onClick={() => setSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? 'الحد الأقصى للمشاريع المقبولة (السعة) *' : 'Max Accepted Projects (Capacity) *'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold focus:outline-hidden focus:border-purple-500"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  {isAr ? 'يمنع النظام قبول مشاريع إضافية عند الوصول لهذا العدد.' : 'Prevents approving more projects once reached.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {isAr ? 'حالة التقديم للجمهور' : 'Public Applications Status'}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="openStatus"
                      checked={newOpenStatus === true}
                      onChange={() => setNewOpenStatus(true)}
                      className="text-purple-600"
                    />
                    <span>{isAr ? 'مفتوح للتقديم' : 'Open'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="openStatus"
                      checked={newOpenStatus === false}
                      onChange={() => setNewOpenStatus(false)}
                      className="text-purple-600"
                    />
                    <span>{isAr ? 'مغلق مؤقتاً' : 'Closed'}</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingSettings ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Settings')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from 'firebase/functions';
import { PlatformEvent, Certificate } from '@/lib/types';
import { formatDateSafe } from '@/lib/dateUtils';
import { ar, enUS } from 'date-fns/locale';
import { 
  Trophy, 
  Award, 
  Calendar, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  UserCheck, 
  Building2, 
  GraduationCap, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ExtendedRegistration {
  id: string;
  status: string;
  timestamp: unknown;
  event: PlatformEvent;
}

interface BadgeDef {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  color: string;
  targetType: 'attendance' | 'points';
  threshold: number;
}

const ALL_BADGES: BadgeDef[] = [
  {
    id: 'ieee_starter',
    titleEn: 'IEEE Starter',
    titleAr: 'عضو مبتدئ',
    descEn: 'Attended your first IEEE community event',
    descAr: 'حضور أول فعالية في مجتمع IEEE الهندسي',
    icon: '🚀',
    color: 'from-blue-500 to-cyan-500',
    targetType: 'attendance',
    threshold: 1,
  },
  {
    id: 'active_engineer',
    titleEn: 'Active Engineer',
    titleAr: 'مهندس نشط',
    descEn: 'Attended 3 engineering workshops or meetups',
    descAr: 'حضور 3 فعاليات هندسية بنجاح',
    icon: '⚡',
    color: 'from-amber-500 to-orange-500',
    targetType: 'attendance',
    threshold: 3,
  },
  {
    id: 'tech_pioneer',
    titleEn: 'Tech Pioneer',
    titleAr: 'رائد تقني',
    descEn: 'Attended 5 community events and bootcamps',
    descAr: 'حضور 5 فعاليات ومعسكرات تقنية',
    icon: '🏆',
    color: 'from-purple-500 to-indigo-600',
    targetType: 'attendance',
    threshold: 5,
  },
  {
    id: 'century_club',
    titleEn: 'Century Club',
    titleAr: 'نادي المئة',
    descEn: 'Earned 100+ activity points on the platform',
    descAr: 'جمع 100 نقطة تفاعلية معتمدة',
    icon: '💎',
    color: 'from-emerald-500 to-teal-600',
    targetType: 'points',
    threshold: 100,
  },
  {
    id: 'engineering_leader',
    titleEn: 'Engineering Leader',
    titleAr: 'قائد هندسي',
    descEn: 'Accumulated 250+ activity points',
    descAr: 'جمع 250 نقطة تفاعلية وحضور قيادي',
    icon: '👑',
    color: 'from-rose-500 to-red-600',
    targetType: 'points',
    threshold: 250,
  },
];

export default function EngineeringProfilePage() {
  const t = useTranslations('Profile');
  const tCommon = useTranslations('Common');
  const tOnboard = useTranslations('Onboarding');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  const { user, userData, loading: authLoading, login } = useAuth();
  const userBadges = userData?.badges || [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<ExtendedRegistration[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (authLoading || !user) {
      return;
    }

    const loadData = async () => {
      try {
        setError(null);
        // 1. Fetch Registrations
        const regQ = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const regSnap = await getDocs(regQ);

        const regsWithEvents: ExtendedRegistration[] = [];
        for (const rDoc of regSnap.docs) {
          const rData = rDoc.data();
          const eventDoc = await getDoc(doc(db, 'events', rData.eventId));
          if (eventDoc.exists()) {
            regsWithEvents.push({
              id: rDoc.id,
              status: rData.status,
              timestamp: rData.timestamp || rData.registeredAt,
              event: { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent,
            });
          }
        }

        // Sort chronological descending
        regsWithEvents.sort((a, b) => {
          const timeA = new Date(formatDateSafe(a.timestamp, 'yyyy-MM-dd HH:mm:ss')).getTime() || 0;
          const timeB = new Date(formatDateSafe(b.timestamp, 'yyyy-MM-dd HH:mm:ss')).getTime() || 0;
          return timeB - timeA;
        });

        // 2. Fetch Certificates
        const certQ = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const certSnap = await getDocs(certQ);
        const certs = certSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Certificate[];

        // 3. Compute Community Rank from Leaderboard
        const rankQ = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(100));
        const rankSnap = await getDocs(rankQ);
        let rankIndex: number | null = null;
        let count = 1;
        for (const uDoc of rankSnap.docs) {
          if (uDoc.id === user.uid) {
            rankIndex = count;
            break;
          }
          count++;
        }

        if (active) {
          setRegistrations(regsWithEvents);
          setCertificates(certs);
          setUserRank(rankIndex || 1);
        }
      } catch (err) {
        console.error('Error fetching engineering profile data:', err);
        if (active) {
          setError(isAr ? 'حدث خطأ أثناء تحميل بيانات الملف.' : 'Failed to load profile data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [user, authLoading, isAr, reloadKey]);

  const handleDownloadCertificate = async (certificateId: string) => {
    setDownloadingCert(certificateId);
    try {
      const getCertUrl = httpsCallable(functions, 'getCertificateDownloadUrl');
      const res = await getCertUrl({ certificateId });
      const data = res.data as { downloadUrl?: string; url?: string };
      const targetUrl = data?.downloadUrl || data?.url;
      if (targetUrl) {
        window.open(targetUrl, '_blank');
      } else {
        alert(isAr ? 'الشهادة قيد التجهيز من قبل المنظمين.' : 'Certificate is being prepared.');
      }
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert(isAr ? 'تعذر فتح الشهادة حالياً. يرجى المحاولة لاحقاً.' : 'Unable to download certificate.');
    } finally {
      setDownloadingCert(null);
    }
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" color="border-blue-600" />
        <p className="mt-4 text-slate-600 text-sm font-medium">{tCommon('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-md w-full text-center border border-gray-100 shadow-xl shadow-blue-900/5">
          <div className="h-20 w-20 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-6 shadow-inner">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold font-cairo text-slate-900 mb-3">{t('title')}</h2>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            {t('loginRequired')}
          </p>
          <button
            onClick={login}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
          >
            {t('loginCTA')}
          </button>
        </div>
      </div>
    );
  }

  // Profile fields using new onboarding data
  const displayName = userData?.arabicFullName || user.displayName || user.email?.split('@')[0] || 'Community Member';
  
  // Format college and major nice
  const getLabel = (type: 'colleges' | 'majors' | 'levels', val?: string | null) => {
    if (!val) return '';
    try {
      return tOnboard(`${type}.${val}`);
    } catch {
      return val;
    }
  };

  const departmentStr = userData?.isQassimStudent 
    ? [getLabel('colleges', userData.college), getLabel('majors', userData.major)].filter(Boolean).join(' - ')
    : (isAr ? 'عضو مجتمع التقنية' : 'Tech Community Member');
    
  const academicLevel = userData?.academicLevel ? getLabel('levels', userData.academicLevel) : '';
  const isQassimStudent = userData?.isQassimStudent;
  const universityId = isQassimStudent && userData?.universityId ? `***${userData.universityId.slice(-4)}` : null; // Partially hidden for privacy

  const totalPoints = userData?.totalPoints ?? 0;
  const attendedCount = registrations.filter(r => r.status === 'attended' || r.status === 'approved').length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                setReloadKey(k => k + 1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{tCommon('retry')}</span>
            </button>
          </div>
        )}

        {/* 1. Student Header Card */}
        <section className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-10">
          <div className="absolute -top-24 -end-24 w-72 h-72 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-4xl flex items-center justify-center overflow-hidden shadow-xl shadow-blue-500/20 border-4 border-white">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -bottom-2 -end-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title={t('activeMember')}>
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-start space-y-2.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {t('college')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{t('activeMember')}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold font-cairo text-slate-900 leading-tight">
                {displayName}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-6 text-sm text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{departmentStr}</span>
                </div>
                {academicLevel && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    <span>{academicLevel}</span>
                  </div>
                )}
                {universityId && (
                  <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-md font-mono text-slate-500">
                    <span>ID: {universityId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action link */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 transition-all"
              >
                <span>{t('exploreEvents')}</span>
                <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Gamification Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Points */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 block">
                {t('totalPoints')}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {loading ? '...' : totalPoints}
              </span>
            </div>
          </div>

          {/* Community Rank */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 block">
                {t('communityRank')}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {loading ? '...' : userRank ? `#${userRank}` : '#-'}
              </span>
            </div>
          </div>

          {/* Events Attended */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Calendar className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 block">
                {t('eventsAttended')}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {loading ? '...' : attendedCount}
              </span>
            </div>
          </div>

          {/* Certificates Earned */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-500 block">
                {t('certificatesEarned')}
              </span>
              <span className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {loading ? '...' : certificates.length}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Earned Badges Showcase */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-cairo text-slate-900 flex items-center gap-2.5">
              <Award className="h-6 w-6 text-yellow-500" />
              <span>{t('badgesTitle')}</span>
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {t('badgesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {ALL_BADGES.map((badge) => {
              const isEarned = userBadges.includes(badge.id) || 
                (badge.targetType === 'attendance' && attendedCount >= badge.threshold) ||
                (badge.targetType === 'points' && totalPoints >= badge.threshold);

              const currentVal = badge.targetType === 'attendance' ? attendedCount : totalPoints;
              const progressPct = Math.min(100, Math.round((currentVal / badge.threshold) * 100));

              return (
                <div
                  key={badge.id}
                  className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                    isEarned
                      ? 'bg-gradient-to-b from-white to-slate-50/60 border-blue-200 shadow-sm hover:shadow-md hover:-translate-y-1'
                      : 'bg-slate-50/70 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                      isEarned ? `bg-gradient-to-tr ${badge.color} text-white` : 'bg-slate-200 text-slate-400'
                    }`}>
                      {badge.icon}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isEarned 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-200 text-slate-500 flex items-center gap-1'
                    }`}>
                      {isEarned ? (
                        t('earned')
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>{t('locked')}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {isAr ? badge.titleAr : badge.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {isAr ? badge.descAr : badge.descEn}
                    </p>
                  </div>

                  {!isEarned && (
                    <div className="mt-auto pt-2">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                        <span>{currentVal} / {badge.threshold}</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Activity Ledger & Verified Certificates Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Activity & Attendance Ledger (7 cols) */}
          <section className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold font-cairo text-slate-900 flex items-center gap-2.5">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span>{t('activityLedger')}</span>
                </h2>
                <span className="text-xs text-slate-500">
                  {registrations.length} {isAr ? 'سجل تفاعلي' : 'recorded items'}
                </span>
              </div>
              <Link
                href="/events"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                {t('exploreEvents')}
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="h-16 w-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base font-cairo">
                  {t('noActivity')}
                </h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {t('noActivityDesc')}
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors mt-2"
                >
                  <span>{t('exploreEvents')}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map((reg) => {
                  const eventDate = reg.event.date;
                  const isAttended = reg.status === 'attended';
                  return (
                    <div
                      key={reg.id}
                      className="p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${
                          isAttended ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-blue-600 shadow-sm shadow-blue-500/20'
                        }`}>
                          {isAttended ? <CheckCircle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                        </div>
                        <div>
                          <Link 
                            href={`/events/${reg.event.id}`}
                            className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors block line-clamp-1"
                          >
                            {isAr ? reg.event.title : (reg.event.titleEn || reg.event.title)}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                            <span>{formatDateSafe(eventDate, 'd MMMM yyyy', { locale: dateLocale })}</span>
                            <span>•</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600">
                              {reg.event.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                          +{reg.event.points || 0} {t('pointsUnit')}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          reg.status === 'attended' || reg.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : reg.status === 'waitlisted'
                              ? 'bg-amber-100 text-amber-700'
                              : reg.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {reg.status === 'attended' ? (isAr ? 'تم الحضور' : 'Attended') :
                           reg.status === 'approved' ? (isAr ? 'مسجل ومؤكد' : 'Confirmed') :
                           reg.status === 'waitlisted' ? (isAr ? 'قائمة الانتظار' : 'Waitlisted') :
                           reg.status === 'cancelled' ? (isAr ? 'ملغى' : 'Cancelled') : reg.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Verified Certificates (5 cols) */}
          <section className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold font-cairo text-slate-900 flex items-center gap-2.5">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <span>{t('certificatesTitle')}</span>
                </h2>
                <span className="text-xs text-slate-500">
                  {certificates.length} {isAr ? 'شهادة معتمدة' : 'issued'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 py-6">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="h-16 w-16 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Award className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base font-cairo">
                  {t('noCertificates')}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                  {t('noCertificatesDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={cert.eventTitle}>
                            {cert.eventTitle}
                          </h4>
                          <span className="text-[11px] text-slate-500 block">
                            {formatDateSafe(cert.issueDate || cert.createdAt, 'dd MMMM yyyy', { locale: dateLocale })}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="h-3 w-3" />
                        <span>{t('verified')}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleDownloadCertificate(cert.id)}
                      disabled={downloadingCert === cert.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {downloadingCert === cert.id ? (
                        <>
                          <LoadingSpinner size="sm" color="border-current" />
                          <span>{isAr ? 'جاري التحميل...' : 'Downloading...'}</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{t('viewCertificate')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}

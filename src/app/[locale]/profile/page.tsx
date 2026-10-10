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
  updateDoc,
  getCountFromServer
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, functions, storage } from '@/lib/firebase/client';
import ProfileSkeleton from '@/components/skeletons/ProfileSkeleton';
import { httpsCallable } from 'firebase/functions';
import { PlatformEvent, Certificate, PointTransaction } from '@/lib/types';
import { formatDateSafe, toJsDate } from '@/lib/dateUtils';
import { ar, enUS } from 'date-fns/locale';
import { 
  Trophy, 
  Award, 
  Calendar, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  UserCheck, 
  GraduationCap, 
  ExternalLink, 
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Edit2,
  X,
  Save,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DigitalMemberCard from '@/components/ui/DigitalMemberCard';

interface CertificateData extends Certificate {
  eventTitle: string;
}

interface RegistrationWithEvent {
  id: string;
  status: string;
  timestamp: unknown;
  event: PlatformEvent;
  certificate?: CertificateData;
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
  const tActivity = useTranslations('Activity');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const dateLocale = isAr ? ar : enUS;

  const { user, userData, loading: authLoading, login, logout } = useAuth();
  const userBadges = userData?.badges || [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  
  const [userRank, setUserRank] = useState<number | null>(null);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'events' | 'points' | 'certificates'>('events');

  // Edit Name State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState({ first: '', middle: '', last: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Edit Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    college: '',
    major: '',
    academicLevel: '',
    universityId: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Card Customization State
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState({
    theme: 'blue',
    pattern: 'none',
    linkedin: ''
  });
  const [isSavingCard, setIsSavingCard] = useState(false);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingCard(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'cardPreferences.theme': editingCard.theme,
        'cardPreferences.pattern': editingCard.pattern,
        'publicProfile.linkedin': editingCard.linkedin.trim()
      });
      setShowCardModal(false);
      alert(isAr ? 'تم حفظ التخصيص بنجاح' : 'Card customization saved');
      setReloadKey(k => k + 1);
    } catch(err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء الحفظ.' : 'Error saving customization');
    } finally {
      setIsSavingCard(false);
    }
  };



  // Public Board Profile State
  const [showPublicProfileModal, setShowPublicProfileModal] = useState(false);
  const [editingPublicProfile, setEditingPublicProfile] = useState({
    linkedin: '',
    bio: '',
    avatar: ''
  });
  const [isSavingPublicProfile, setIsSavingPublicProfile] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleSavePublicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingPublicProfile(true);
    try {
      let avatarUrl = editingPublicProfile.avatar;
      
      if (avatarFile) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(avatarFile.type) || avatarFile.size > 5 * 1024 * 1024) {
          throw new Error(isAr ? 'اختر صورة JPG أو PNG أو WebP أصغر من 5 ميغابايت.' : 'Choose a JPG, PNG, or WebP image under 5 MB.');
        }
        const fileRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
        await uploadBytes(fileRef, avatarFile);
        avatarUrl = await getDownloadURL(fileRef);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        publicProfile: {
          linkedin: editingPublicProfile.linkedin.trim(),
          bio: editingPublicProfile.bio.trim(),
          avatar: avatarUrl
        }
      });
      alert(isAr ? 'تم الحفظ بنجاح!' : 'Saved successfully!');
      setShowPublicProfileModal(false);
      setAvatarFile(null);
      setReloadKey(k => k + 1); // reload data
    } catch (err) {
      console.error('Error saving public profile:', err);
      alert(isAr ? 'حدث خطأ أثناء الحفظ.' : 'Error saving profile.');
    } finally {
      setIsSavingPublicProfile(false);
    }
  };

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

        // 2. Fetch Certificates
        const certQ = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const certSnap = await getDocs(certQ);
        const certsData = certSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CertificateData[];
        const certsByEvent = certsData.reduce((acc, cert) => {
          acc[cert.eventId] = cert;
          return acc;
        }, {} as Record<string, CertificateData>);

        const regsWithEvents: RegistrationWithEvent[] = [];
        for (const rDoc of regSnap.docs) {
          const rData = rDoc.data();
          const eventDoc = await getDoc(doc(db, 'events', rData.eventId));
          if (eventDoc.exists()) {
            regsWithEvents.push({
              id: rDoc.id,
              status: rData.status,
              timestamp: rData.timestamp || rData.registeredAt,
              event: { id: eventDoc.id, ...eventDoc.data() } as PlatformEvent,
              certificate: certsByEvent[eventDoc.id]
            });
          }
        }

        regsWithEvents.sort((a, b) => {
          const timeA = toJsDate(a.timestamp)?.getTime() || 0;
          const timeB = toJsDate(b.timestamp)?.getTime() || 0;
          return timeB - timeA;
        });

        // 3. Fetch Point Transactions
        const ptQ = query(collection(db, 'point_transactions'), where('userId', '==', user.uid));
        const ptSnap = await getDocs(ptQ);
        const ptsData = ptSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PointTransaction[];
        ptsData.sort((a, b) => {
          const tA = toJsDate(a.createdAt)?.getTime() || 0;
          const tB = toJsDate(b.createdAt)?.getTime() || 0;
          return tB - tA;
        });

        // 4. Compute Community Rank accurately via O(1) aggregation
        const myPoints = userData?.totalPoints || 0;
        const higherPointsQuery = query(
          collection(db, 'public_profiles'),
          where('totalPoints', '>', myPoints)
        );
        const rankCountSnap = await getCountFromServer(higherPointsQuery);
        const userCalculatedRank = rankCountSnap.data().count + 1;

        if (active) {
          setRegistrations(regsWithEvents);
          setCertificates(certsData.sort((a, b) => {
            const tA = toJsDate(a.issueDate || a.createdAt)?.getTime() || 0;
            const tB = toJsDate(b.issueDate || b.createdAt)?.getTime() || 0;
            return tB - tA;
          }));
          setTransactions(ptsData);
          setUserRank(userCalculatedRank);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
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
  }, [user, authLoading, isAr, reloadKey, userData?.totalPoints]);

  const handleDownloadCertificate = async (certificateId: string) => {
    setDownloadingCert(certificateId);
    try {
      const getCertUrl = httpsCallable(functions, 'getCertificateDownloadUrl');
      const res = await getCertUrl({ certificateId });
      const data = res.data as { downloadUrl?: string; url?: string };
      const targetUrl = data?.downloadUrl || data?.url;
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${editingName.first} ${editingName.middle} ${editingName.last}`.trim().replace(/\s+/g, ' ');
    if (!fullName || !user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        arabicFullName: fullName,
        firstName: editingName.first.trim(),
        fatherName: editingName.middle.trim(),
        familyName: editingName.last.trim()
      });
      setShowEditModal(false);
      alert(isAr ? 'تم حفظ الاسم بنجاح' : 'Name saved successfully');
    } catch(err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء التحديث.' : 'Error updating name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        college: editingProfile.college,
        major: editingProfile.major,
        academicLevel: editingProfile.academicLevel,
        universityId: editingProfile.universityId
      });
      setShowProfileModal(false);
      alert(isAr ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch(err) {
      console.error(err);
      alert(isAr ? 'حدث خطأ أثناء التحديث.' : 'Error updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authLoading) {
    return <ProfileSkeleton />;
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

  const totalPoints = userData?.totalPoints ?? 0;
  const attendedCount = registrations.filter(r => r.status === 'attended').length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-5xl mx-auto space-y-8">

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

        {/* 1. Digital Member Card */}
        <div className="relative">
          <DigitalMemberCard 
            user={user}
            userData={userData}
            rank={userRank}
            totalPoints={totalPoints}
            onEditName={() => {
              const parts = (userData?.arabicFullName || '').split(' ').filter(Boolean);
              setEditingName({
                first: userData?.firstName || parts[0] || '',
                middle: userData?.fatherName || (parts.length > 2 ? parts.slice(1, -1).join(' ') : (parts.length === 2 ? parts[1] : '')),
                last: userData?.familyName || (parts.length > 2 ? parts[parts.length - 1] : '')
              });
              setShowEditModal(true);
            }}
            onEditProfile={() => {
              setEditingProfile({
                college: userData?.college || '',
                major: userData?.major || '',
                academicLevel: userData?.academicLevel || '',
                universityId: userData?.universityId || ''
              });
              setShowProfileModal(true);
            }}
            onLogout={logout}
          />
          <div className="absolute top-4 rtl:left-4 ltr:right-4 z-20 md:hidden flex gap-2">
             <button 
                onClick={() => {
                  setEditingCard({
                    theme: userData?.cardPreferences?.theme || 'blue',
                    pattern: userData?.cardPreferences?.pattern || 'none',
                    linkedin: userData?.publicProfile?.linkedin || ''
                  });
                  setShowCardModal(true);
                }}
                className="bg-indigo-600/80 hover:bg-indigo-600 backdrop-blur-md border border-indigo-400/30 text-white p-2 rounded-xl flex items-center justify-center transition-colors shadow-lg"
                title={isAr ? 'تخصيص البطاقة' : 'Customize Pass'}
             >
                <Edit2 className="w-5 h-5" />
             </button>
             <Link 
                href="/profile/pass" 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white p-2 rounded-xl flex items-center justify-center transition-colors shadow-lg"
                title={isAr ? 'عرض البطاقة بملء الشاشة' : 'View Full Screen Pass'}
             >
                <ExternalLink className="w-5 h-5" />
             </Link>
          </div>
          <div className="hidden md:flex justify-end -mt-4 mb-4 gap-2">
             <button 
                onClick={() => {
                  setEditingCard({
                    theme: userData?.cardPreferences?.theme || 'blue',
                    pattern: userData?.cardPreferences?.pattern || 'none',
                    linkedin: userData?.publicProfile?.linkedin || ''
                  });
                  setShowCardModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm relative z-20"
             >
                <Edit2 className="w-4 h-4" />
                <span>{isAr ? 'تخصيص البطاقة' : 'Customize Pass'}</span>
             </button>
             <Link 
                href="/profile/pass" 
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm relative z-20"
             >
                <ExternalLink className="w-4 h-4" />
                <span>{isAr ? 'عرض البطاقة الرقمية' : 'View Digital Pass'}</span>
             </Link>
          </div>
        </div>

        {/* Public Board Profile Edit Button (Admin/Organizer Only) */}
        {(userData?.role === 'super_admin' || userData?.role === 'event_organizer') && (
          <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{isAr ? 'الملف التعريفي العام (أعضاء الإدارة)' : 'Public Board Profile'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{isAr ? 'تحديث اللينكدإن، النبذة والصورة لصفحة الهيكلة.' : 'Update your avatar, LinkedIn & Bio for the Structure page.'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingPublicProfile({
                  linkedin: userData?.publicProfile?.linkedin || '',
                  bio: userData?.publicProfile?.bio || '',
                  avatar: userData?.publicProfile?.avatar || ''
                });
                setShowPublicProfileModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              {isAr ? 'تعديل الملف' : 'Edit Profile'}
            </button>
          </div>
        )}

        {/* 2. Gamification Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

          <div className="flex overflow-x-auto pb-4 snap-x sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 hide-scrollbar">
            {ALL_BADGES.map((badge) => {
              const isEarned = userBadges.includes(badge.id) || 
                (badge.targetType === 'attendance' && attendedCount >= badge.threshold) ||
                (badge.targetType === 'points' && totalPoints >= badge.threshold);

              const currentVal = badge.targetType === 'attendance' ? attendedCount : totalPoints;
              const progressPct = Math.min(100, Math.round((currentVal / badge.threshold) * 100));

              return (
                <div
                  key={badge.id}
                  className={`relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between shrink-0 w-72 sm:w-auto snap-center ${
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

        {/* 4. Activity, Points, and Certificates Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'events' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tActivity('tabs.events')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'events' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {registrations.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'points' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tActivity('tabs.points')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'points' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {transactions.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('certificates')}
              className={`flex-1 py-4 sm:py-5 font-bold text-center transition-all text-sm sm:text-base font-cairo flex items-center justify-center gap-2 ${
                activeTab === 'certificates' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{tActivity('tabs.certificates')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'certificates' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {certificates.length}
              </span>
            </button>
          </div>

          <div className="p-6 sm:p-8 min-h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <LoadingSpinner size="md" color="border-blue-600" />
              </div>
            ) : (
              <>
                {/* Events Tab */}
                {activeTab === 'events' && (
                  <div className="space-y-4">
                    {registrations.length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center">
                        <Calendar className="h-16 w-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{tActivity('noEvents')}</h3>
                        <Link href="/events" className="mt-4 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-xs">
                          {isAr ? 'تصفح الفعاليات' : 'Browse Events'}
                        </Link>
                      </div>
                    ) : (
                      registrations.map((reg, idx) => (
                        <div 
                          key={idx} 
                          className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50/50 hover:border-blue-100 transition-all shadow-xs flex flex-col gap-4 text-start"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Calendar className="h-6 w-6" />
                              </div>
                              <div>
                                <Link 
                                  href={`/events/${reg.event.id}`}
                                  className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors block"
                                >
                                  {isAr ? reg.event.title : (reg.event.titleEn || reg.event.title)}
                                </Link>
                                <div className="flex items-center text-xs text-slate-500 mt-1">
                                  <Clock className="h-3.5 w-3.5 me-1 text-slate-400" />
                                  <span>{formatDateSafe(reg.timestamp, 'dd MMMM yyyy', { locale: dateLocale })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-start md:self-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                reg.status === 'approved' || reg.status === 'attended' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : reg.status === 'waitlisted' 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : reg.status === 'cancelled' 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-slate-100 text-slate-700'
                              }`}>
                                {reg.status === 'approved' ? tActivity('statusApproved') :
                                 reg.status === 'waitlisted' ? tActivity('statusWaitlisted') :
                                 reg.status === 'cancelled' ? tActivity('statusCancelled') :
                                 reg.status === 'attended' ? (isAr ? 'تم الحضور' : 'Attended') : reg.status}
                              </span>
                            </div>
                          </div>
                          
                          {reg.certificate && (
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>{isAr ? 'شهادة الحضور معتمدة' : 'Verified Certificate Available'}</span>
                              </span>
                              <button
                                onClick={() => handleDownloadCertificate(reg.certificate!.id)}
                                disabled={downloadingCert === reg.certificate!.id}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>{isAr ? 'عرض الشهادة' : 'View Certificate'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Points Tab */}
                {activeTab === 'points' && (
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center">
                        <Trophy className="h-16 w-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{tActivity('noPoints')}</h3>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              tx.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              <ArrowUpRight className={`h-5 w-5 ${tx.amount < 0 ? 'rotate-90' : ''}`} />
                            </div>
                            <div>
                              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold mb-1 ${
                                tx.source === 'attendance' ? 'bg-blue-100 text-blue-800' : 
                                tx.source === 'manual_adjustment' ? 'bg-purple-100 text-purple-800' : 
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {tx.source === 'attendance' ? tActivity('sourceAttendance') : 
                                 tx.source === 'manual_adjustment' ? tActivity('sourceManual') : 
                                 tx.source === 'attendance_override' ? tActivity('sourceOverride') : 'System'}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">{tx.reason}</h4>
                              <p className="text-xs text-slate-400 flex items-center mt-0.5">
                                <Clock className="h-3 w-3 me-1" />
                                <span>{formatDateSafe(tx.createdAt, 'dd MMMM yyyy HH:mm', { locale: dateLocale })}</span>
                              </p>
                            </div>
                          </div>

                          <div className={`font-black text-xl font-cairo ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Certificates Tab */}
                {activeTab === 'certificates' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certificates.length === 0 ? (
                      <div className="col-span-1 sm:col-span-2 text-center py-16 flex flex-col items-center">
                        <Award className="h-16 w-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 font-cairo mb-2">{tActivity('noCertificates')}</h3>
                      </div>
                    ) : (
                      certificates.map((cert) => (
                        <div 
                          key={cert.id} 
                          className="border border-emerald-100 bg-emerald-50/20 rounded-2xl p-5 hover:bg-emerald-50/50 transition-colors space-y-4 text-start"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                <Award className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1" title={cert.eventTitle}>
                                  {cert.eventTitle}
                                </h4>
                                <span className="text-xs text-slate-500 block mt-0.5">
                                  {formatDateSafe(cert.issueDate || cert.createdAt, 'dd MMMM yyyy', { locale: dateLocale })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownloadCertificate(cert.id)}
                            disabled={downloadingCert === cert.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed group"
                          >
                            {downloadingCert === cert.id ? (
                              <>
                                <LoadingSpinner size="sm" color="border-white" className="me-1.5" />
                                <span>{isAr ? 'جاري الفتح...' : 'Opening...'}</span>
                              </>
                            ) : (
                              <>
                                <span>{isAr ? 'عرض الشهادة المعتمدة' : 'View Accredited Certificate'}</span>
                                <ExternalLink className="h-3.5 w-3.5 ms-1" />
                              </>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 rtl:left-4 ltr:right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold font-cairo text-slate-900 mb-2">
              {isAr ? 'تعديل الاسم الشخصي' : 'Edit Full Name'}
            </h3>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex gap-3 text-sm mb-5">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="font-medium">
                {isAr ? 'تنبيه: هذا هو الاسم الذي سيظهر في الشهادات المعتمدة الخاصة بك. تأكد من كتابته بشكل صحيح (الاسم الأول والأب والعائلة).' : 'Note: This name will appear on your accredited certificates. Ensure it is written correctly.'}
              </p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'الاسم الأول' : 'First Name'}</label>
                  <input type="text" required value={editingName.first} onChange={e => setEditingName({...editingName, first: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={isAr ? 'مثال: بدر' : 'e.g. Bader'} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'اسم الأب' : 'Father Name'}</label>
                  <input type="text" required value={editingName.middle} onChange={e => setEditingName({...editingName, middle: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={isAr ? 'مثال: عبدالله' : 'e.g. Abdullah'} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'اسم العائلة' : 'Family Name'}</label>
                  <input type="text" required value={editingName.last} onChange={e => setEditingName({...editingName, last: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={isAr ? 'مثال: الدخيل الله' : 'e.g. Aldakhilallah'} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <LoadingSpinner size="sm" color="border-white" /> : <Save className="h-4 w-4" />}
                  <span>{isAr ? 'حفظ' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 rtl:left-4 ltr:right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold font-cairo text-slate-900 mb-6">
              {isAr ? 'تعديل البيانات الأكاديمية' : 'Edit Academic Details'}
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'الكلية' : 'College'}</label>
                <select required value={editingProfile.college} onChange={e => setEditingProfile({...editingProfile, college: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">{isAr ? 'اختر الكلية' : 'Select College'}</option>
                  <option value="engineering">{isAr ? 'كلية الهندسة' : 'Engineering'}</option>
                  <option value="computer_science">{isAr ? 'كلية الحاسب' : 'Computer Science'}</option>
                  <option value="other">{isAr ? 'كلية أخرى' : 'Other'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'التخصص' : 'Major'}</label>
                <input type="text" required value={editingProfile.major} onChange={e => setEditingProfile({...editingProfile, major: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={isAr ? 'مثال: هندسة كهربائية' : 'e.g. Electrical Engineering'} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'المستوى الأكاديمي' : 'Academic Level'}</label>
                <input type="text" required value={editingProfile.academicLevel} onChange={e => setEditingProfile({...editingProfile, academicLevel: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={isAr ? 'مثال: المستوى الخامس' : 'e.g. Level 5'} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'الرقم الجامعي' : 'University ID'}</label>
                <input type="text" required value={editingProfile.universityId} onChange={e => setEditingProfile({...editingProfile, universityId: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="4xxxxxxxxx" />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSavingProfile ? <LoadingSpinner size="sm" color="border-white" /> : <Save className="h-4 w-4" />}
                  <span>{isAr ? 'حفظ' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Public Board Profile Modal */}
      {showPublicProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{isAr ? 'تحديث الملف التعريفي' : 'Update Public Profile'}</h2>
              <button
                onClick={() => setShowPublicProfileModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSavePublicProfile} className="p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {isAr ? 'صورة العرض (Avatar)' : 'Avatar'}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {avatarFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : editingPublicProfile.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editingPublicProfile.avatar} alt="Current" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-xl file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100 cursor-pointer transition-colors"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isAr ? 'الصيغ المدعومة: PNG, JPG (الحد الأقصى 2MB)' : 'Supported formats: PNG, JPG (Max 2MB)'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isAr ? 'حساب لينكدإن (LinkedIn URL)' : 'LinkedIn URL'}
                </label>
                <input
                  type="url"
                  value={editingPublicProfile.linkedin}
                  onChange={(e) => setEditingPublicProfile({...editingPublicProfile, linkedin: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-right"
                  placeholder="https://linkedin.com/in/username"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isAr ? 'نبذة تعريفية قصيرة' : 'Short Bio'}
                </label>
                <textarea
                  value={editingPublicProfile.bio}
                  onChange={(e) => setEditingPublicProfile({...editingPublicProfile, bio: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none h-24"
                  placeholder={isAr ? 'اكتب نبذة بسيطة عنك...' : 'Write a short bio about yourself...'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPublicProfileModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPublicProfile}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isSavingPublicProfile ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{tCommon('save')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Customization Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{isAr ? 'تخصيص البطاقة الرقمية' : 'Customize Digital Pass'}</h2>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCard} className="p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {isAr ? 'سمة الألوان (Theme)' : 'Color Theme'}
                </label>
                <div className="grid grid-cols-5 gap-2 sm:gap-4">
                  {[
                    { id: 'blue', color: 'bg-blue-500' },
                    { id: 'emerald', color: 'bg-emerald-500' },
                    { id: 'gold', color: 'bg-amber-500' },
                    { id: 'purple', color: 'bg-purple-500' },
                    { id: 'rose', color: 'bg-rose-500' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEditingCard({...editingCard, theme: t.id})}
                      className={`h-12 w-full rounded-xl ${t.color} flex items-center justify-center transition-all ${
                        editingCard.theme === t.id ? 'ring-4 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105 opacity-80'
                      }`}
                    >
                      {editingCard.theme === t.id && <CheckCircle className="h-5 w-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  {isAr ? 'النمط الهندسي (Pattern)' : 'Background Pattern'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'none', label: isAr ? 'بدون' : 'None' },
                    { id: 'dots', label: isAr ? 'نقاط' : 'Dots' },
                    { id: 'grid', label: isAr ? 'شبكة' : 'Grid' },
                    { id: 'waves', label: isAr ? 'دوائر' : 'Waves' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditingCard({...editingCard, pattern: p.id})}
                      className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${
                        editingCard.pattern === p.id 
                          ? 'bg-slate-800 text-white border-slate-800' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isAr ? 'حساب لينكدإن (للظهور في البطاقة)' : 'LinkedIn (Display on Pass)'}
                </label>
                <input
                  type="url"
                  value={editingCard.linkedin}
                  onChange={(e) => setEditingCard({...editingCard, linkedin: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-right"
                  placeholder="https://linkedin.com/in/username"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isSavingCard ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{tCommon('save')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

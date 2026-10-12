'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ArrowLeft, ArrowRight, Zap, Trophy, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { memberMajorLabel, memberPassUrl } from '@/lib/memberPresentation';
import { SITE_URL } from '@/lib/site';

export default function PassClient() {
  const { user, userData, loading } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/profile');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002f56]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = userData?.arabicFullName || user.displayName || 'Member';
  const major = memberMajorLabel(userData?.major, isAr);
  const joinDate = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).getFullYear() 
    : new Date().getFullYear();
  const totalPoints = userData?.totalPoints || 0;

  return (
    <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Navigation */}
      <button 
        type="button"
        aria-label={isAr ? 'العودة إلى حسابي' : 'Back to my account'}
        onClick={() => router.push('/profile')}
        className="absolute top-6 rtl:right-6 ltr:left-6 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
      >
        {isAr ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
      </button>

      {/* Pass Card Container */}
      <div className="relative w-full max-w-sm mt-12 mb-8 perspective-1000">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden transform transition-transform duration-500 hover:scale-[1.02]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex flex-col items-center justify-center relative overflow-hidden h-32">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
            <div className="z-10 flex flex-col items-center">
              <span className="text-white/80 font-black text-xs tracking-[0.3em] uppercase mb-1">IEEE Qassim Branch</span>
              <h2 className="text-white font-black text-2xl tracking-widest drop-shadow-md">DIGITAL PASS</h2>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 pt-12 pb-6 flex flex-col items-center text-center relative -mt-10">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-3xl bg-slate-800 p-1 shadow-xl shadow-black/50 border border-white/20 z-20 mb-4">
              <div className="w-full h-full relative bg-slate-900 rounded-[1.2rem] overflow-hidden flex items-center justify-center text-3xl font-black text-white">
                {user.photoURL ? (
                  <Image src={user.photoURL} alt={displayName} fill sizes="96px" className="object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-slate-800 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <h3 className="break-words text-2xl font-bold text-white leading-relaxed mb-1">{displayName}</h3>
            <p className="text-blue-300 text-sm font-medium mb-6">{major}</p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-3xl shadow-lg w-full max-w-[240px] aspect-square flex items-center justify-center mx-auto mb-6 relative group">
              <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-xl group-hover:bg-blue-500/20 transition-colors"></div>
              <QRCodeSVG 
                value={memberPassUrl(SITE_URL, locale, user.uid)}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"Q"}
                marginSize={4}
                title={isAr ? 'فتح بطاقة العضو العامة' : 'Open public member pass'}
                className="relative z-10"
              />
            </div>

            <p className="text-slate-300 text-xs font-mono font-semibold mb-6">{isAr ? 'معرّف العضوية:' : 'Member ID:'} <bdi>{user.uid.substring(0, 12)}</bdi></p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 w-full border-t border-white/10 pt-6">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-white font-bold text-sm">{totalPoints}</span>
                <span className="text-slate-300 text-xs">{isAr ? 'نقاط' : 'Points'}</span>
              </div>
              <div className="flex flex-col items-center border-x border-white/10">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-white font-bold text-sm text-emerald-300">{isAr ? 'عضو' : 'Member'}</span>
                <span className="text-slate-300 text-xs">{isAr ? 'الحالة' : 'Status'}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-white font-bold text-sm">{joinDate}</span>
                <span className="text-slate-300 text-xs">{isAr ? 'منذ' : 'Since'}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      <p className="text-slate-300 text-sm text-center font-medium max-w-xs">
        {isAr ? 'قم بإبراز هذه البطاقة عند الدخول لفعاليات الفرع الطلابي لتسجيل حضورك' : 'Present this pass at student branch events to register your attendance'}
      </p>
    </div>
  );
}

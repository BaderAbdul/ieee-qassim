'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Calendar, Trophy, Zap, Edit2, LogOut } from 'lucide-react';
import { useLocale } from 'next-intl';

interface DigitalMemberCardProps {
  user: any;
  userData: any;
  rank: number | null;
  totalPoints: number;
  onEditName: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export default function DigitalMemberCard({ user, userData, rank, totalPoints, onEditName, onEditProfile, onLogout }: DigitalMemberCardProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  if (!user) return null;

  const displayName = userData?.arabicFullName || userData?.name || user.displayName || 'Member';
  
  // Basic translation helpers for the card
  const getLabel = (en: string, ar: string) => isAr ? ar : en;
  const major = userData?.major || 'General Member';
  
  // Format join date if exists
  const joinDate = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).getFullYear() 
    : new Date().getFullYear();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#002f56] to-slate-900 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 mb-8 border border-white/10 group">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left side: Identity */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-start flex-1">
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-1 shadow-xl shadow-blue-900/50">
              <div className="w-full h-full bg-slate-900 rounded-[1.35rem] overflow-hidden flex items-center justify-center text-4xl font-black text-white">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white p-2 rounded-full border-4 border-[#002f56] shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-4 py-2">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-blue-300 font-black text-[10px] tracking-widest uppercase">IEEE QU PASS</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h2 className="text-2xl sm:text-4xl font-black text-white font-cairo leading-tight">{displayName}</h2>
                <button 
                  onClick={onEditName}
                  className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors backdrop-blur-sm"
                  title={isAr ? 'تعديل الاسم' : 'Edit Name'}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <p className="text-blue-200 text-sm font-medium">{major}</p>
                <button 
                  onClick={onEditProfile}
                  className="p-1 text-white/50 hover:text-white transition-colors"
                  title={isAr ? 'تعديل البيانات الأكاديمية' : 'Edit Academic Details'}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-white font-bold text-sm">{totalPoints} <span className="text-white/60 text-xs font-normal">{getLabel('pts', 'نقطة')}</span></span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-sm">#{rank || '-'} <span className="text-white/60 text-xs font-normal">{getLabel('Rank', 'المركز')}</span></span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-white font-bold text-sm">Since {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: QR Code and Logout */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center">
            <div className="bg-white p-3.5 rounded-2xl shadow-inner">
              <QRCodeSVG 
                value={`ieee-qu-user:${user.uid}`} 
                size={130}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"Q"}
                includeMargin={false}
              />
            </div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mt-4 font-mono font-bold">ID: {user.uid.substring(0, 10)}</p>
          </div>
          
          <button
            onClick={onLogout}
            className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-white/50 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

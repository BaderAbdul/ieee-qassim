'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Calendar, Trophy, Zap, Edit2, LogOut, Hexagon } from 'lucide-react';
import Image from 'next/image';
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
  
  const getLabel = (en: string, ar: string) => isAr ? ar : en;
  const major = userData?.major || 'General Member';
  
  const joinDate = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).getFullYear() 
    : new Date().getFullYear();

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      {/* The Pass Container */}
      <div className="relative bg-[#0B1121] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-800 overflow-hidden flex flex-col sm:flex-row group">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

        {/* Left Side: Pass Info */}
        <div className="relative z-10 flex-1 p-6 sm:p-10 flex flex-col justify-between">
           {/* Header */}
           <div className="flex items-start justify-between mb-8 sm:mb-10">
             <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Hexagon className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-200 font-bold text-xs tracking-widest uppercase">IEEE QU PASS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Active Member</span>
                </div>
             </div>
             <button 
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"
              >
                <LogOut className="w-3 h-3 rtl:rotate-180" />
                <span>{isAr ? 'خروج' : 'Logout'}</span>
              </button>
           </div>

           {/* User Profile */}
           <div className="flex items-center gap-5 sm:gap-6 mb-8 sm:mb-12">
             <div className="relative shrink-0">
               <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-1 shadow-lg shadow-blue-900/30">
                 <div className="w-full h-full relative bg-slate-900 rounded-[0.9rem] sm:rounded-[0.6rem] overflow-hidden flex items-center justify-center text-3xl font-black text-white">
                   {user.photoURL ? (
                     <Image src={user.photoURL} alt={displayName} fill sizes="112px" className="object-cover" />
                   ) : (
                     displayName.charAt(0).toUpperCase()
                   )}
                 </div>
               </div>
               <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 sm:p-2 rounded-full border-2 sm:border-[3px] border-[#0B1121] shadow-sm">
                 <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
             </div>

             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <h2 className="text-xl sm:text-3xl font-black text-white font-cairo leading-tight truncate">{displayName}</h2>
                  <button onClick={onEditName} className="shrink-0 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-blue-200 text-xs sm:text-sm font-medium truncate">{major}</p>
                  <button onClick={onEditProfile} className="shrink-0 p-1 text-white/40 hover:text-white transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
             </div>
           </div>

           {/* Stats Row */}
           <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 backdrop-blur-md">
             <div className="flex flex-col items-center justify-center text-center">
               <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mb-1 sm:mb-1.5" />
               <span className="text-white font-bold text-sm sm:text-lg leading-none mb-1">{totalPoints}</span>
               <span className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{getLabel('Points', 'نقاط')}</span>
             </div>
             <div className="flex flex-col items-center justify-center text-center border-l border-r border-white/10">
               <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mb-1 sm:mb-1.5" />
               <span className="text-white font-bold text-sm sm:text-lg leading-none mb-1">#{rank || '-'}</span>
               <span className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{getLabel('Rank', 'المركز')}</span>
             </div>
             <div className="flex flex-col items-center justify-center text-center">
               <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-1 sm:mb-1.5" />
               <span className="text-white font-bold text-sm sm:text-lg leading-none mb-1">{joinDate}</span>
               <span className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{getLabel('Joined', 'انضمام')}</span>
             </div>
           </div>
        </div>

        {/* Right Side: QR Code (separated by dashed line) */}
        <div className="relative z-10 w-full sm:w-72 bg-white/5 sm:bg-transparent flex flex-col items-center justify-center p-8 sm:p-10 border-t sm:border-t-0 sm:border-l border-white/10 border-dashed backdrop-blur-sm">
           {/* Top and Bottom semi-circles to look like a pass ticket cut. 
               The profile page background is bg-slate-50, so these match it. */}
           <div className="hidden sm:block absolute top-0 left-0 -ml-4 -mt-4 w-8 h-8 bg-slate-50 rounded-full border-b border-r border-slate-800 rotate-45"></div>
           <div className="hidden sm:block absolute bottom-0 left-0 -ml-4 -mb-4 w-8 h-8 bg-slate-50 rounded-full border-t border-r border-slate-800 -rotate-45"></div>
           
           <div className="bg-white p-3.5 sm:p-4 rounded-[1.5rem] shadow-2xl">
             <QRCodeSVG 
               value={`ieee-qu-user:${user.uid}`} 
               size={140}
               bgColor={"#ffffff"}
               fgColor={"#0f172a"}
               level={"Q"}
               includeMargin={false}
             />
           </div>
           
           <div className="mt-6 text-center space-y-1">
             <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono font-bold">Member ID</p>
             <p className="text-white/80 text-xs font-mono tracking-widest font-bold">{user.uid.substring(0, 10)}</p>
           </div>
        </div>

      </div>
    </div>
  );
}

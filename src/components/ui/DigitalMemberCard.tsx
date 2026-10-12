'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Calendar, Trophy, Zap, Edit2, LogOut, Hexagon } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';

import { User } from 'firebase/auth';
import { Link as LinkIcon } from 'lucide-react'; // Added LinkIcon for linkedin

interface DigitalMemberCardProps {
  user: User;
  userData: { 
    arabicFullName?: string; 
    name?: string; 
    major?: string | null; 
    college?: string | null; 
    publicProfile?: { linkedin?: string };
    cardPreferences?: { theme?: string; pattern?: string; };
  } | null;
  rank: number | null;
  totalPoints: number;
  onEditName?: () => void; // Made optional for public view
  onEditProfile?: () => void; // Made optional for public view
  onLogout?: () => void; // Made optional for public view
  isPublicView?: boolean; // New prop to disable editing UI
}

export default function DigitalMemberCard({ user, userData, rank, totalPoints, onEditName, onEditProfile, onLogout, isPublicView = false }: DigitalMemberCardProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  if (!user) return null;

  const displayName = userData?.arabicFullName || userData?.name || user.displayName || 'Member';
  
  const getLabel = (en: string, ar: string) => isAr ? ar : en;
  const major = userData?.major || 'General Member';
  
  const joinDate = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).getFullYear() 
    : new Date().getFullYear();

  // Customization
  const theme = userData?.cardPreferences?.theme || 'blue';
  const pattern = userData?.cardPreferences?.pattern || 'none';
  const linkedinUrl = userData?.publicProfile?.linkedin;

  const getThemeColors = () => {
    switch (theme) {
      case 'emerald': return { glow1: 'bg-emerald-600/20', glow2: 'bg-teal-600/10', avatar: 'from-emerald-500 to-teal-500', shield: 'bg-emerald-500' };
      case 'gold': return { glow1: 'bg-amber-500/20', glow2: 'bg-orange-600/10', avatar: 'from-amber-400 to-orange-500', shield: 'bg-amber-500' };
      case 'purple': return { glow1: 'bg-purple-600/20', glow2: 'bg-fuchsia-600/10', avatar: 'from-purple-500 to-fuchsia-500', shield: 'bg-purple-500' };
      case 'rose': return { glow1: 'bg-rose-600/20', glow2: 'bg-pink-600/10', avatar: 'from-rose-500 to-pink-500', shield: 'bg-rose-500' };
      case 'blue':
      default: return { glow1: 'bg-blue-600/20', glow2: 'bg-emerald-600/10', avatar: 'from-blue-500 to-indigo-500', shield: 'bg-emerald-500' };
    }
  };

  const getPatternClass = () => {
    switch (pattern) {
      case 'dots': return 'bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px]';
      case 'grid': return 'bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]';
      case 'waves': return 'bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#ffffff05_10px,transparent_20px)]';
      default: return '';
    }
  };

  const colors = getThemeColors();
  const patternClass = getPatternClass();

  // QR Code URL pointing to public pass view
  const qrValue = typeof window !== 'undefined' 
    ? `${window.location.origin}/pass/${user.uid}` 
    : `https://www.ieeequ.online/pass/${user.uid}`;

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      {/* The Pass Container */}
      <div className={`relative bg-[#0B1121] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-800 overflow-hidden flex flex-col sm:flex-row group ${patternClass}`}>
        
        {/* Decorative elements */}
        <div className={`absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 ${colors.glow1} rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60`}></div>
        <div className={`absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 ${colors.glow2} rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60`}></div>
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
                  <div className={`w-1.5 h-1.5 rounded-full ${colors.shield}`}></div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider`} style={{color: theme === 'gold' ? '#fbbf24' : (theme === 'emerald' ? '#34d399' : (theme==='purple'?'#c084fc':(theme==='rose'?'#fb7185':'#34d399')) )}}>Active Member</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
               {linkedinUrl && (
                 <a 
                   href={linkedinUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/60 hover:text-[#0A66C2] transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"
                   title="LinkedIn Profile"
                 >
                   <LinkIcon className="w-3 h-3" />
                   <span className="hidden sm:inline">LinkedIn</span>
                 </a>
               )}
               {!isPublicView && onLogout && (
                 <button 
                    onClick={onLogout}
                    className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/40 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"
                  >
                    <LogOut className="w-3 h-3 rtl:rotate-180" />
                    <span>{isAr ? 'خروج' : 'Logout'}</span>
                  </button>
               )}
             </div>
           </div>

           {/* User Profile */}
           <div className="flex items-center gap-5 sm:gap-6 mb-8 sm:mb-12">
             <div className="relative shrink-0">
               <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr ${colors.avatar} p-1 shadow-lg shadow-blue-900/30`}>
                 <div className="w-full h-full relative bg-slate-900 rounded-[0.9rem] sm:rounded-[0.6rem] overflow-hidden flex items-center justify-center text-3xl font-black text-white">
                   {user.photoURL ? (
                     <Image src={user.photoURL} alt={displayName} fill sizes="112px" className="object-cover" />
                   ) : (
                     displayName.charAt(0).toUpperCase()
                   )}
                 </div>
               </div>
               <div className={`absolute -bottom-2 -right-2 ${colors.shield} text-white p-1.5 sm:p-2 rounded-full border-2 sm:border-[3px] border-[#0B1121] shadow-sm`}>
                 <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
             </div>

             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <h2 className="text-xl sm:text-3xl font-black text-white font-cairo leading-tight truncate">{displayName}</h2>
                  {!isPublicView && onEditName && (
                    <button onClick={onEditName} className="shrink-0 p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-blue-200 text-xs sm:text-sm font-medium truncate">{major}</p>
                  {!isPublicView && onEditProfile && (
                    <button onClick={onEditProfile} className="shrink-0 p-1 text-white/40 hover:text-white transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
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
               value={qrValue} 
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

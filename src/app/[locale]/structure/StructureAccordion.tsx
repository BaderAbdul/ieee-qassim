'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Link as LinkIcon, ExternalLink, X, Users } from 'lucide-react';
import Image from 'next/image';

export interface CommitteeMember {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
  linkedin?: string;
}

export interface Committee {
  id: string;
  name: string;
  description: string;
  iconName: string;
  members: CommitteeMember[];
}

interface StructureAccordionProps {
  committees: Committee[];
  isAr: boolean;
}

// Helper function to extract First & Last Name
function getShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function StructureAccordion({ committees, isAr }: StructureAccordionProps) {
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (committees.length > 0 && !activeTabId) {
      setActiveTabId(committees[0].id);
    }
  }, [committees, activeTabId]);

  useEffect(() => {
    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTabId(entry.target.id.replace('committee-', ''));
          
          // Scroll the tab into view
          const tabButton = document.getElementById(`tab-${entry.target.id.replace('committee-', '')}`);
          if (tabButton) {
            tabButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      });
    };

    observer.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is in the top 20-30% of viewport
      threshold: 0,
    });

    committees.forEach((committee) => {
      const element = document.getElementById(`committee-${committee.id}`);
      if (element) {
        observer.current?.observe(element);
      }
    });

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [committees]);

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
    const element = document.getElementById(`committee-${id}`);
    if (element) {
      // Offset for the sticky header
      const headerOffset = 160; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (committees.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-slate-500 text-sm font-medium">
          {isAr ? 'لم يتم إضافة الهيكلة الإدارية بعد.' : 'Organizational structure not added yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      
      {/* 1. Sticky Tabs Navigation */}
      <div className="sticky top-[72px] sm:top-[88px] z-40 bg-slate-50/90 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-200/50 shadow-sm transition-all">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-2 px-1 sm:justify-center snap-x snap-mandatory scroll-smooth">
          {committees.map((committee) => {
            const isActive = committee.id === activeTabId;
            return (
              <button
                key={committee.id}
                id={`tab-${committee.id}`}
                onClick={() => handleTabClick(committee.id)}
                className={`
                  relative flex items-center gap-2 px-5 py-3 rounded-full text-sm sm:text-base font-bold whitespace-nowrap snap-center shrink-0 transition-all duration-300
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-sm'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-blue-500 blur-sm opacity-20 -z-10 animate-pulse"></span>
                )}
                <span>{committee.name}</span>
                <span className={`
                  flex items-center justify-center text-[10px] sm:text-xs h-5 px-2 rounded-full font-bold
                  ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                `}>
                  {committee.members?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. All Committees Content (ScrollSpy layout) */}
      <div className="space-y-16 sm:space-y-24">
        {committees.map((committee) => (
          <div 
            key={committee.id} 
            id={`committee-${committee.id}`}
            className="scroll-mt-[180px]"
          >
            <div className="bg-white/80 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-white/60 p-4 sm:p-8 lg:p-10 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:bg-white/90">
              
              {/* Decorative background elements inside the card */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/80 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/80 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>
              
              {/* Header info */}
              <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 mb-4 shadow-inner">
                   <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">{committee.name}</h2>
                {committee.description && (
                  <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                    {committee.description}
                  </p>
                )}
              </div>

              {/* Members Grid */}
              <div className="relative z-10">
                {committee.members && committee.members.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                    {committee.members.map((member) => {
                      const displayName = getShortName(member.name);
                      
                      return (
                        <div 
                          key={member.userId || member.name} 
                          onClick={() => setSelectedMember(member)}
                          className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-center shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-500 cursor-pointer flex flex-col items-center hover:-translate-y-2 hover:border-blue-200"
                        >
                          <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 mb-3 sm:mb-4 flex items-center justify-center shadow-inner overflow-hidden border-2 border-white group-hover:scale-105 transition-transform duration-500">
                            {member.avatar ? (
                              <Image 
                                src={member.avatar} 
                                alt={member.name} 
                                fill 
                                sizes="(max-width: 640px) 64px, 96px"
                                className="object-cover" 
                              />
                            ) : (
                              <User className="h-6 w-6 sm:h-8 sm:w-8 opacity-70" />
                            )}
                            
                            {/* Hover Overlay with Icons */}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                              {member.linkedin && (
                                <a 
                                  href={member.linkedin} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm"
                                  title="LinkedIn"
                                >
                                  <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </a>
                              )}
                              <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </span>
                            </div>
                          </div>

                          <h3 className="font-bold text-slate-900 text-xs sm:text-base group-hover:text-blue-600 transition-colors line-clamp-1 w-full px-1" title={member.name}>
                            {displayName}
                          </h3>
                          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-1 line-clamp-2 w-full">
                            {member.role}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm font-medium">
                      {isAr ? 'لا يوجد أعضاء مضافين في هذه اللجنة حتى الآن.' : 'No members added to this committee yet.'}
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        ))}
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-4 pt-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center border-4 border-white shadow-lg relative">
                {selectedMember.avatar ? (
                  <Image src={selectedMember.avatar} alt={selectedMember.name} fill sizes="96px" className="object-cover" />
                ) : (
                  <User className="h-10 w-10 opacity-70" />
                )}
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">{selectedMember.name}</h3>
                <p className="text-blue-600 font-bold text-sm mt-1 bg-blue-50 inline-block px-3 py-1 rounded-full">{selectedMember.role}</p>
              </div>
              
              <div className="pt-2 flex justify-center gap-3">
                {selectedMember.linkedin && (
                  <a 
                    href={selectedMember.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#0A66C2]/10 text-slate-600 hover:text-[#0A66C2] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200 hover:border-[#0A66C2]/30 w-full"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span>{isAr ? 'حساب لينكدإن' : 'LinkedIn'}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

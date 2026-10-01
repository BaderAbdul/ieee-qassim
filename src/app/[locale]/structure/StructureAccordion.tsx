'use client';

import React, { useState, useEffect } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (committees.length > 0 && !activeTabId) {
      setActiveTabId(committees[0].id);
    }
  }, [committees, activeTabId]);

  const handleTabChange = (id: string) => {
    if (id === activeTabId) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTabId(id);
      setIsAnimating(false);
    }, 150); // Small delay to allow fade out
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

  const activeCommittee = committees.find(c => c.id === activeTabId) || committees[0];

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      
      {/* 1. Tabs / Pills Navigation */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 sm:justify-center sm:flex-wrap snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {committees.map((committee) => {
            const isActive = committee.id === activeTabId;
            return (
              <button
                key={committee.id}
                onClick={() => handleTabChange(committee.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-bold whitespace-nowrap snap-center shrink-0 transition-all duration-300
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm'
                  }
                `}
              >
                <span>{committee.name}</span>
                <span className={`
                  flex items-center justify-center text-[10px] h-5 min-w-[20px] px-1.5 rounded-full font-bold
                  ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                `}>
                  {committee.members?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Committee Content */}
      <div 
        className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
      >
        {activeCommittee && (
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8">
            
            {/* Header info */}
            <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
                 <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{activeCommittee.name}</h2>
              {activeCommittee.description && (
                <p className="text-sm text-slate-500 leading-relaxed">
                  {activeCommittee.description}
                </p>
              )}
            </div>

            {/* Members Grid */}
            <div>
              {activeCommittee.members && activeCommittee.members.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {activeCommittee.members.map((member) => {
                    const displayName = getShortName(member.name);
                    
                    return (
                      <div 
                        key={member.userId || member.name} 
                        onClick={() => setSelectedMember(member)}
                        className="group bg-white rounded-2xl p-3 sm:p-4 text-center border border-slate-100 hover:border-blue-200 hover:shadow-md hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col items-center"
                      >
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 text-slate-400 mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                          {member.avatar ? (
                            <Image 
                              src={member.avatar} 
                              alt={member.name} 
                              fill 
                              sizes="64px"
                              className="object-cover" 
                            />
                          ) : (
                            <User className="h-6 w-6 opacity-60" />
                          )}
                          
                          {/* Hover Overlay with Icons */}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                            {member.linkedin && (
                              <a 
                                href={member.linkedin} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 w-6 rounded-full bg-white text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm"
                                title="LinkedIn"
                              >
                                <LinkIcon className="h-3 w-3" />
                              </a>
                            )}
                            <span className="h-6 w-6 rounded-full bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
                              <ExternalLink className="h-3 w-3" />
                            </span>
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm transition-colors line-clamp-1 w-full px-1" title={member.name}>
                          {displayName}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 w-full">
                          {member.role}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">
                    {isAr ? 'لا يوجد أعضاء مضافين في هذه اللجنة.' : 'No members added to this committee.'}
                  </p>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-3 pt-2">
              <div className="relative h-20 w-20 mx-auto rounded-full overflow-hidden bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                {selectedMember.avatar ? (
                  <Image src={selectedMember.avatar} alt={selectedMember.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <User className="h-8 w-8 opacity-60" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedMember.name}</h3>
                <p className="text-blue-600 font-semibold text-sm mt-0.5">{selectedMember.role}</p>
              </div>
              
              <div className="pt-3">
                {selectedMember.linkedin && (
                  <a 
                    href={selectedMember.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#0A66C2]/10 text-slate-600 hover:text-[#0A66C2] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200 w-full"
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

'use client';

import React, { useState } from 'react';
import { User, Link as LinkIcon, ExternalLink, X, Shield, Award, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

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
  const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null);

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
    <div className="space-y-8">
      {committees.map((committee) => {
        const memberCount = committee.members?.length || 0;
        return (
          <div 
            key={committee.id} 
            className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden"
          >
            {/* Header Section */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{committee.name}</h2>
                {committee.description && (
                  <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{committee.description}</p>
                )}
              </div>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100/60 flex-shrink-0">
                {memberCount} {isAr ? 'عضو' : 'Members'}
              </span>
            </div>

            {/* Members Grid Section */}
            <div className="p-4 sm:p-5">
              {committee.members && committee.members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {committee.members.map((member) => {
                    const displayName = getShortName(member.name);

                    return (
                      <div 
                        key={member.userId || member.name} 
                        onClick={() => setSelectedMember(member)}
                        className="group relative bg-white p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2 text-start"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors truncate" title={member.name}>
                            {displayName}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                            {member.role}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {member.linkedin && (
                            <a 
                              href={member.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                              title="LinkedIn"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <span className="h-7 w-7 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {isAr ? 'لا يوجد أعضاء مضافين في هذه اللجنة حتى الآن.' : 'No members added to this committee yet.'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Member Profile Modal */}
      {selectedMember && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-3 pt-2">
              <div className="h-16 w-16 mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center border-2 border-white shadow-md relative">
                {selectedMember.avatar ? (
                  <Image src={selectedMember.avatar} alt={selectedMember.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white/90" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedMember.name}</h3>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">{selectedMember.role}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                {selectedMember.userId && (
                  <Link 
                    href={`/profile?id=${selectedMember.userId}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <User className="h-3.5 w-3.5" />
                    {isAr ? 'عرض البروفايل الشخصي' : 'View Profile'}
                  </Link>
                )}
                {selectedMember.linkedin && (
                  <a 
                    href={selectedMember.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    LinkedIn
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


'use client';

import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, User, Link as LinkIcon } from 'lucide-react';
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

export default function StructureAccordion({ committees, isAr }: StructureAccordionProps) {
  const [expandedCommittee, setExpandedCommittee] = useState<string | null>(null);

  const toggleCommittee = (id: string) => {
    if (expandedCommittee === id) {
      setExpandedCommittee(null);
    } else {
      setExpandedCommittee(id);
    }
  };

  if (committees.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <p className="text-slate-500 font-medium">
          {isAr ? 'لم يتم إضافة الهيكلة الإدارية بعد.' : 'Organizational structure not added yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {committees.map((committee) => {
        const isExpanded = expandedCommittee === committee.id;
        const memberCount = committee.members?.length || 0;
        return (
          <div 
            key={committee.id} 
            className={`bg-white rounded-3xl shadow-xs border transition-all duration-300 overflow-hidden ${
              isExpanded ? 'border-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <button 
              onClick={() => toggleCommittee(committee.id)}
              className="w-full px-5 py-5 sm:px-8 sm:py-6 flex items-center justify-between bg-white hover:bg-slate-50/80 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 text-start min-w-0">
                <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isExpanded ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{committee.name}</h2>
                    <span className="sm:hidden text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full flex-shrink-0">
                      {memberCount}
                    </span>
                  </div>
                  {committee.description && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate max-w-xl">{committee.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden sm:flex bg-slate-100 text-slate-700 px-3.5 py-1 rounded-full text-xs font-bold">
                  {memberCount} {isAr ? 'أعضاء' : 'Members'}
                </div>
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-colors ${
                  isExpanded ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </button>

            <div 
              className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
            >
              <div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/50">
                {committee.members && committee.members.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {committee.members.map((member) => (
                      <div key={member.userId} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5">
                        <div className="h-12 w-12 relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0 flex items-center justify-center border-2 border-white shadow-xs">
                          {member.avatar ? (
                            <Image src={member.avatar} alt={member.name} fill sizes="48px" className="object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div className="overflow-hidden flex-1 text-start">
                          <h3 className="font-bold text-slate-900 text-sm truncate" title={member.name}>{member.name}</h3>
                          <p className="text-xs font-bold text-blue-600 mt-0.5 truncate">{member.role}</p>
                        </div>
                        {member.linkedin && (
                          <a 
                            href={member.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors flex-shrink-0"
                            title="LinkedIn"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 text-sm">
                    {isAr ? 'لا يوجد أعضاء مضافين في هذه اللجنة حتى الآن.' : 'No members added to this committee yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

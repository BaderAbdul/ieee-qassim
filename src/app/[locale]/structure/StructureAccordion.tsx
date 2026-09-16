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
      {committees.map((committee) => (
        <div key={committee.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
          <button 
            onClick={() => toggleCommittee(committee.id)}
            className="w-full px-6 py-6 sm:px-8 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-4 text-start">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{committee.name}</h2>
                {committee.description && (
                  <p className="text-sm text-slate-500 mt-1">{committee.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                {committee.members?.length || 0} {isAr ? 'أعضاء' : 'Members'}
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                {expandedCommittee === committee.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </button>

          <div 
            className={`transition-all duration-500 ease-in-out ${expandedCommittee === committee.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
          >
            <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50">
              {committee.members && committee.members.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {committee.members.map((member) => (
                    <div key={member.userId} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                      <div className="h-12 w-12 relative rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                        {member.avatar ? (
                          <Image src={member.avatar} alt={member.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h3 className="font-bold text-slate-900 text-sm truncate" title={member.name}>{member.name}</h3>
                        <p className="text-xs font-bold text-blue-600 mt-0.5 truncate">{member.role}</p>
                      </div>
                      {member.linkedin && (
                        <a 
                          href={member.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors flex-shrink-0"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                  {isAr ? 'لا يوجد أعضاء مضافين في هذه اللجنة.' : 'No members added to this committee.'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Users, ChevronDown, ChevronUp, User, Linkedin } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface CommitteeMember {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
  linkedin?: string;
}

interface Committee {
  id: string;
  name: string;
  description: string;
  iconName: string;
  members: CommitteeMember[];
}

export default function StructurePage() {
  const t = useTranslations();
  const params = useParams();
  const isAr = params.locale === 'ar';
  
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCommittee, setExpandedCommittee] = useState<string | null>(null);

  useEffect(() => {
    const fetchStructure = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'homepage'));
        if (docSnap.exists() && docSnap.data().committees) {
          setCommittees(docSnap.data().committees);
        }
      } catch (err) {
        console.error("Error fetching structure", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStructure();
  }, []);

  const toggleCommittee = (id: string) => {
    if (expandedCommittee === id) {
      setExpandedCommittee(null);
    } else {
      setExpandedCommittee(id);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="flex-grow pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 font-thmanyah uppercase tracking-tight">
              {isAr ? 'الهيكلة الإدارية' : 'Organizational Structure'}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
              {isAr 
                ? 'تعرف على اللجان وفرق العمل التي تقود مبادرات وفعاليات النادي.' 
                : 'Meet the committees and teams driving the club initiatives and events.'}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : committees.length > 0 ? (
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
                              <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
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
                                  <Linkedin className="h-4 w-4" />
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
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 font-medium">
                {isAr ? 'لم يتم إضافة الهيكلة الإدارية بعد.' : 'Organizational structure not added yet.'}
              </p>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}

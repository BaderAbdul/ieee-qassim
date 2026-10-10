'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Lightbulb, Calendar, Rocket, Clock, CheckCircle, XCircle } from 'lucide-react';

type Idea = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  title: string;
  description: string;
  status: string;
  isPublic?: boolean;
  votesCount?: number;
  createdAt: { toDate: () => Date };
};

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'ideas'), orderBy('createdAt', 'desc')));
        setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Idea[]);
      } catch (error) { console.error('Error fetching ideas:', error); }
      finally { setLoading(false); }
    };
    void fetchIdeas();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'ideas', id), {
        status: newStatus
      });
      setIdeas(ideas.map(idea => idea.id === id ? { ...idea, status: newStatus } : idea));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const togglePublic = async (id: string, currentIsPublic: boolean | undefined) => {
    try {
      const newIsPublic = !currentIsPublic;
      const updates: { isPublic: boolean; votesCount?: number; voters?: string[] } = { isPublic: newIsPublic };
      if (newIsPublic && currentIsPublic === undefined) {
        updates.votesCount = 0;
        updates.voters = [];
      }
      await updateDoc(doc(db, 'ideas', id), updates);
      
      setIdeas(ideas.map(idea => idea.id === id ? { ...idea, isPublic: newIsPublic } : idea));
    } catch (error) {
      console.error('Error toggling public status:', error);
      alert('حدث خطأ أثناء تحديث النشر');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'workshop': return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'initiative': return <Rocket className="w-5 h-5 text-emerald-500" />;
      default: return <Lightbulb className="w-5 h-5 text-slate-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'idea': return 'اقتراح فعالية';
      case 'workshop': return 'تقديم ورشة';
      case 'initiative': return 'مبادرة مجتمعية';
      default: return 'فكرة';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" /> مقبولة</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> مرفوضة</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> قيد المراجعة</span>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black font-cairo text-slate-900">الأفكار والمبادرات</h1>
        <p className="text-slate-500 text-sm mt-1">استعرض الأفكار والمقترحات المقدمة من أعضاء النادي</p>
      </div>

      {ideas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">لا توجد أفكار مقدمة بعد</h3>
          <p className="text-slate-500 mt-2">ستظهر هنا أي مقترحات يقدمها الأعضاء عبر المنصة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    idea.type === 'idea' ? 'bg-blue-50' : 
                    idea.type === 'workshop' ? 'bg-purple-50' : 'bg-emerald-50'
                  }`}>
                    {getTypeIcon(idea.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-slate-900">{idea.title}</h3>
                      {getStatusBadge(idea.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-700">{getTypeName(idea.type)}</span>
                      <span>•</span>
                      <span>بواسطة: <span className="font-bold text-slate-700">{idea.userName}</span></span>
                      <span>•</span>
                      <span>{idea.userEmail}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-4 rtl:md:pr-0 rtl:md:border-r-0 rtl:md:border-l rtl:md:pl-4">
                  <button 
                    onClick={() => updateStatus(idea.id, 'approved')}
                    disabled={idea.status === 'approved'}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      idea.status === 'approved' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    قبول
                  </button>
                  <button 
                    onClick={() => updateStatus(idea.id, 'rejected')}
                    disabled={idea.status === 'rejected'}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      idea.status === 'rejected' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    رفض
                  </button>
                </div>
                
                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-4 rtl:md:pr-0 rtl:md:border-r-0 rtl:md:border-l rtl:md:pl-4 mt-4 md:mt-0">
                  <button 
                    onClick={() => togglePublic(idea.id, idea.isPublic)}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                      idea.isPublic 
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {idea.isPublic ? 'معروض للجمهور للتصويت' : 'عرض للجمهور'}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mt-2">
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{idea.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

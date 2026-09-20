'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/context/AuthContext';
import { Lightbulb, ThumbsUp, LogIn, ChevronRight, Rocket, Calendar } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

type Idea = {
  id: string;
  title: string;
  description: string;
  userName: string;
  type: string;
  votesCount?: number;
  voters?: string[];
  isPublic?: boolean;
};

export default function IdeasClient() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, login } = useAuth();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const fetchIdeas = async () => {
    try {
      const q = query(collection(db, 'ideas'), where('isPublic', '==', true));
      const snapshot = await getDocs(q);
      const fetchedIdeas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Idea[];
      
      // Sort by votesCount descending
      fetchedIdeas.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
      
      setIdeas(fetchedIdeas);
    } catch (error) {
      console.error('Error fetching public ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIdeas();
  }, []);

  const handleVote = async (ideaId: string, currentVoters: string[]) => {
    if (!user) {
      login();
      return;
    }

    const hasVoted = currentVoters?.includes(user.uid);
    const ideaRef = doc(db, 'ideas', ideaId);

    // Optimistic UI update
    setIdeas(prev => prev.map(idea => {
      if (idea.id === ideaId) {
        const newVoters = hasVoted 
          ? (idea.voters || []).filter(v => v !== user.uid)
          : [...(idea.voters || []), user.uid];
        
        return {
          ...idea,
          voters: newVoters,
          votesCount: newVoters.length
        };
      }
      return idea;
    }));

    try {
      if (hasVoted) {
        await updateDoc(ideaRef, {
          voters: arrayRemove(user.uid),
          votesCount: increment(-1)
        });
      } else {
        await updateDoc(ideaRef, {
          voters: arrayUnion(user.uid),
          votesCount: increment(1)
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Revert on error by re-fetching
      fetchIdeas();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idea': return <Lightbulb className="w-6 h-6 text-blue-500" />;
      case 'workshop': return <Calendar className="w-6 h-6 text-purple-500" />;
      case 'initiative': return <Rocket className="w-6 h-6 text-emerald-500" />;
      default: return <Lightbulb className="w-6 h-6 text-amber-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'idea': return isAr ? 'اقتراح فعالية' : 'Event Idea';
      case 'workshop': return isAr ? 'تقديم ورشة' : 'Workshop Proposal';
      case 'initiative': return isAr ? 'مبادرة مجتمعية' : 'Initiative';
      default: return isAr ? 'فكرة' : 'Idea';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/events" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronRight className="w-8 h-8 rtl:-scale-x-100" />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-cairo mb-2">
            {isAr ? 'ساحة الأفكار' : 'Ideas Arena'}
          </h1>
          <p className="text-slate-500">
            {isAr ? 'صوّت لأفضل الأفكار والمبادرات لتحويلها إلى واقع' : 'Vote for the best ideas to turn them into reality'}
          </p>
        </div>
      </div>

      {!user && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl mb-8 flex items-center justify-between">
          <p className="font-medium text-sm">
            {isAr ? 'سجل دخولك لكي تتمكن من التصويت على الأفكار' : 'Log in to vote on ideas'}
          </p>
          <button onClick={login} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
            <LogIn className="w-4 h-4" />
            {isAr ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      )}

      {ideas.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
          <Lightbulb className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            {isAr ? 'لا توجد أفكار حالياً' : 'No ideas currently'}
          </h3>
          <p className="text-slate-500">
            {isAr ? 'لم يتم طرح أفكار للتصويت بعد. شاركنا فكرتك وسنضعها هنا!' : 'No ideas have been published for voting yet. Share yours!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {ideas.map((idea) => {
            const hasVoted = user ? idea.voters?.includes(user.uid) : false;
            
            return (
              <div key={idea.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-6 items-start">
                
                {/* Voting Column */}
                <div className="flex sm:flex-col items-center gap-2 bg-slate-50 rounded-2xl p-2 min-w-[80px] shrink-0 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => handleVote(idea.id, idea.voters || [])}
                    className={`p-3 rounded-xl transition-colors ${
                      hasVoted 
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                        : 'bg-white text-slate-400 hover:bg-amber-50 hover:text-amber-500 shadow-sm border border-slate-200'
                    }`}
                  >
                    <ThumbsUp className={`w-6 h-6 ${hasVoted ? 'fill-amber-600' : ''}`} />
                  </button>
                  <span className={`font-black text-2xl ${hasVoted ? 'text-amber-600' : 'text-slate-700'}`}>
                    {idea.votesCount || 0}
                  </span>
                </div>

                {/* Idea Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      idea.type === 'idea' ? 'bg-blue-50' : 
                      idea.type === 'workshop' ? 'bg-purple-50' : 'bg-emerald-50'
                    }`}>
                      {getTypeIcon(idea.type)}
                    </div>
                    <span className="text-sm font-bold text-slate-500">{getTypeName(idea.type)}</span>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">{idea.title}</h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">{idea.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                      {idea.userName.charAt(0)}
                    </span>
                    <span>{isAr ? 'اقترح بواسطة:' : 'Proposed by:'} <strong className="text-slate-700">{idea.userName}</strong></span>
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

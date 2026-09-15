'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/client';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function CompleteProfilePage() {
  const t = useTranslations('Onboarding');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  
  // Form State
  const [universityId, setUniversityId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [college, setCollege] = useState('');
  const [major, setMajor] = useState('');
  const [academicLevel, setAcademicLevel] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Prevent rendering if user not loaded or profile already completed (handled by guard, but safe measure)
    if (!user) return;
  }, [user]);

  const validateForm = async () => {
    const newErrors: { [key: string]: string } = {};

    // Validate Name parts (Arabic letters and spaces only)
    const arabicRegex = /^[\u0600-\u06FF\s]+$/;
    if (!firstName.trim() || !arabicRegex.test(firstName)) {
      newErrors.firstName = isAr ? 'يجب إدخال الاسم الأول بالعربية' : 'First name required in Arabic';
    }
    if (!fatherName.trim() || !arabicRegex.test(fatherName)) {
      newErrors.fatherName = isAr ? 'يجب إدخال اسم الأب بالعربية' : 'Father name required in Arabic';
    }
    if (!familyName.trim() || !arabicRegex.test(familyName)) {
      newErrors.familyName = isAr ? 'يجب إدخال اسم العائلة بالعربية' : 'Family name required in Arabic';
    }

    if (isStudent) {
      // Validate University ID
      const uidNorm = universityId.trim();
      if (!/^\d{9}$/.test(uidNorm)) {
        newErrors.universityId = t('errors.universityIdFormat');
      } else {
        // Check uniqueness in Firestore
        try {
          const q = query(collection(db, 'users'), where('universityId', '==', uidNorm));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            newErrors.universityId = t('errors.idTaken');
          }
        } catch (e) {
          console.error("Error checking ID uniqueness:", e);
        }
      }

      if (!college) newErrors.college = t('errors.required');
      if (!major) newErrors.major = t('errors.required');
      if (!academicLevel) newErrors.academicLevel = t('errors.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrors({});

    const isValid = await validateForm();
    if (!isValid) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: Record<string, string | boolean | null> = {
        firstName: firstName.trim(),
        fatherName: fatherName.trim(),
        familyName: familyName.trim(),
        arabicFullName: `${firstName.trim()} ${fatherName.trim()} ${familyName.trim()}`,
        isQassimStudent: isStudent,
        profileCompleted: true,
        profileCompletedAt: new Date().toISOString(),
      };

      if (isStudent) {
        updateData.universityId = universityId.trim();
        updateData.college = college;
        updateData.major = major;
        updateData.academicLevel = academicLevel;
      }

      await updateDoc(userRef, updateData);
      
      setSuccess(true);
      // Brief pause to show success state before redirecting
      setTimeout(() => {
        router.replace('/'); 
      }, 1500);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors({ general: t('errors.general') });
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white text-center rounded-3xl p-10 shadow-2xl max-w-sm w-full animate-float">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold font-cairo mb-2 text-slate-800">{t('success')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-8 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100">
        
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-3xl font-bold font-cairo mb-2">{t('title')}</h1>
          <p className="text-blue-100 font-medium">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {errors.general && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
              {errors.general}
            </div>
          )}

          {/* Step 1: Is Student? */}
          <div className="space-y-4">
            <label className="block text-lg font-bold text-slate-800 mb-4">{t('isStudent')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsStudent(true)}
                className={`p-4 rounded-xl border-2 font-bold transition-all ${
                  isStudent === true 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('yes')}
              </button>
              <button
                type="button"
                onClick={() => setIsStudent(false)}
                className={`p-4 rounded-xl border-2 font-bold transition-all ${
                  isStudent === false 
                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('no')}
              </button>
            </div>
          </div>

          {/* Fields if Student selected Yes or No */}
          {isStudent !== null && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 mt-6 border-t border-slate-100 space-y-5">
              
              {isStudent && (
                <h3 className="text-xl font-bold text-slate-800 mb-4 font-cairo">{t('universityData')}</h3>
              )}

              {/* Arabic Full Name - Required for both */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'الاسم الأول' : 'First Name'}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={isAr ? 'الاسم الأول' : 'First'}
                    className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.firstName ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'اسم الأب' : 'Father Name'}</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder={isAr ? 'اسم الأب' : 'Father'}
                    className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.fatherName ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                  />
                  {errors.fatherName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fatherName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{isAr ? 'العائلة' : 'Family Name'}</label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder={isAr ? 'العائلة' : 'Family'}
                    className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.familyName ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                  />
                  {errors.familyName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.familyName}</p>}
                </div>
              </div>

              {isStudent && (
                <>
                  {/* University ID */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('universityId')}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={universityId}
                      onChange={(e) => {
                        // Keep only digits
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 9) setUniversityId(val);
                      }}
                      placeholder={t('universityIdPlaceholder')}
                      className={`w-full p-3 bg-slate-50 border rounded-xl text-left focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.universityId ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                    />
                    {errors.universityId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.universityId}</p>}
                  </div>

                  {/* College */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('college')}</label>
                    <select
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.college ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                    >
                      <option value="">{t('collegePlaceholder')}</option>
                      {['engineering', 'computer', 'science', 'other'].map(c => (
                        <option key={c} value={c}>{t(`colleges.${c}`)}</option>
                      ))}
                    </select>
                    {errors.college && <p className="text-red-500 text-xs mt-1 font-medium">{errors.college}</p>}
                  </div>

                  {/* Major */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('major')}</label>
                    <select
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.major ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                    >
                      <option value="">{t('majorPlaceholder')}</option>
                      {['electrical', 'civil', 'mechanical', 'cs', 'it', 'other'].map(m => (
                        <option key={m} value={m}>{t(`majors.${m}`)}</option>
                      ))}
                    </select>
                    {errors.major && <p className="text-red-500 text-xs mt-1 font-medium">{errors.major}</p>}
                  </div>

                  {/* Level */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('level')}</label>
                    <select
                      value={academicLevel}
                      onChange={(e) => setAcademicLevel(e.target.value)}
                      className={`w-full p-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.academicLevel ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'}`}
                    >
                      <option value="">{t('levelPlaceholder')}</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                        <option key={lvl} value={lvl.toString()}>{t(`levels.${lvl}`)}</option>
                      ))}
                    </select>
                    {errors.academicLevel && <p className="text-red-500 text-xs mt-1 font-medium">{errors.academicLevel}</p>}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-6 hover:bg-blue-700 transition-all disabled:opacity-70"
              >
                {loading ? t('completing') : t('completeProfile')}
              </button>

            </div>
          )}

        </form>
      </div>
    </div>
  );
}

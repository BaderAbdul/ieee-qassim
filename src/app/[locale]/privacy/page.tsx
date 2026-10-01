'use client';
import { useLocale } from 'next-intl';
import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-cairo text-slate-900">
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
        </div>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          {isAr ? (
            <>
              <p>نحن في النادي الطلابي لجمعية مهندسي الكهرباء والإلكترونيات (IEEE) بجامعة القصيم نأخذ خصوصيتك على محمل الجد. توضح هذه السياسة كيف نقوم بجمع، استخدام، وحماية بياناتك الشخصية.</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">1. البيانات التي نجمعها</h3>
              <p>نقوم بجمع المعلومات التي تقدمها طواعية عند التسجيل في الموقع، مثل الاسم، البريد الإلكتروني، القسم الأكاديمي، ورقم الطالب، بالإضافة إلى البيانات الناتجة عن نشاطك في الموقع مثل التسجيل في الفعاليات والأنشطة.</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">2. استخدام البيانات</h3>
              <p>تُستخدم بياناتك لإدارة عضويتك في النادي، إصدار الشهادات، وتوفير تجربة مخصصة لك في المنصة (مثل لوحة الشرف والنقاط). لا نقوم بمشاركة بياناتك مع أي طرف ثالث لأغراض تجارية.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">3. حماية البيانات</h3>
              <p>نحن نستخدم خدمات وتقنيات موثوقة لحماية بياناتك من الوصول غير المصرح به. جميع البيانات مخزنة بشكل آمن ومشفر.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">4. حقوقك</h3>
              <p>يحق لك طلب تعديل أو حذف بياناتك في أي وقت عن طريق التواصل مع إدارة النادي.</p>
            </>
          ) : (
            <>
              <p>At the IEEE Student Branch at Qassim University, we take your privacy seriously. This policy explains how we collect, use, and protect your personal data.</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">1. Information We Collect</h3>
              <p>We collect information you voluntarily provide when registering, such as your name, email, academic department, and student ID, as well as data generated from your activity on the platform (e.g., event registrations).</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">2. Use of Data</h3>
              <p>Your data is used to manage your club membership, issue certificates, and provide a personalized experience (like the leaderboard and points). We do not share your data with third parties for commercial purposes.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">3. Data Protection</h3>
              <p>We use reliable services and technologies to protect your data against unauthorized access. All data is stored securely and encrypted.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">4. Your Rights</h3>
              <p>You have the right to request the modification or deletion of your data at any time by contacting the club administration.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

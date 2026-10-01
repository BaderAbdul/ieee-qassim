'use client';
import { useLocale } from 'next-intl';
import React from 'react';
import { FileText } from 'lucide-react';

export default function TermsAndConditions() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-cairo text-slate-900">
            {isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </h1>
        </div>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          {isAr ? (
            <>
              <p>مرحباً بك في المنصة الرسمية لفرع IEEE الطلابي بجامعة القصيم. باستخدامك لهذه المنصة، فإنك توافق على الشروط والأحكام التالية:</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">1. قبول الشروط</h3>
              <p>عن طريق التسجيل والوصول إلى الموقع، فإنك توافق على الالتزام بهذه الشروط وبلوائح النادي والجامعة.</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">2. السلوك العام</h3>
              <p>يُتوقع من جميع الأعضاء والمسجلين الالتزام بآداب السلوك المهني والأكاديمي. يُمنع استخدام المنصة لأي غرض يسيء للآخرين أو يخالف القوانين والأنظمة.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">3. الفعاليات والشهادات</h3>
              <p>تخضع الموافقة على الحضور للحصة الاستيعابية، ويُمنح الأعضاء الشهادات بناءً على توثيق حضورهم الفعلي للفعالية. الإدارة تحتفظ بالحق في سحب أو إلغاء الشهادات في حال تبين وجود تلاعب.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">4. إخلاء المسؤولية</h3>
              <p>يبذل فريقنا قصارى جهده لضمان استمرارية المنصة ودقة المعلومات، ولكننا لا نتحمل المسؤولية عن أي أخطاء تقنية قد تؤثر على تجربتك.</p>
            </>
          ) : (
            <>
              <p>Welcome to the official platform of the IEEE Student Branch at Qassim University. By using this platform, you agree to the following terms and conditions:</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">1. Acceptance of Terms</h3>
              <p>By registering and accessing the site, you agree to be bound by these terms, as well as the rules of the club and the university.</p>
              
              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">2. General Conduct</h3>
              <p>All members and registrants are expected to adhere to professional and academic etiquette. The platform may not be used for any purpose that harms others or violates laws and regulations.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">3. Events and Certificates</h3>
              <p>Event attendance approval is subject to capacity. Certificates are awarded based on verified attendance. The administration reserves the right to revoke certificates if any manipulation is detected.</p>

              <h3 className="text-lg font-bold text-slate-900 mt-6 mb-3">4. Disclaimer</h3>
              <p>Our team does its best to ensure platform availability and information accuracy, but we are not liable for any technical errors that may affect your experience.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

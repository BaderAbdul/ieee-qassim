import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'ar' ? 'المساعدة | IEEE القصيم' : 'Help | IEEE Qassim', alternates: { canonical: `${SITE_URL}/${locale}/help`, languages: { ar: `${SITE_URL}/ar/help`, en: `${SITE_URL}/en/help` } } };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; const isAr = locale === 'ar';
  const questions = isAr ? [
    ['كيف أسجل في فعالية؟', 'افتح تفاصيل الفعالية، سجّل دخولك بحساب Google وأكمل بياناتك، ثم اضغط التسجيل. التسجيل التلقائي يؤكد المقعد عند توفره، واليدوي ينتظر اعتماد المنظم.'],
    ['ماذا تعني قائمة الانتظار؟', 'الانتظار لا يؤكد مقعدًا. عند توفر مقعد تُحدّث حالة الطلب؛ قد يتطلب اعتمادًا يدويًا. راجع حالة تسجيلك قبل الحضور.'],
    ['كيف أسجل حضوري؟', 'أثناء الفعالية امسح رمز المنظم أو اطلب منه مسح بطاقتك. دخول صفحة الفعالية أو التسجيل فيها وحده لا يوثق الحضور. إذا انتهى الرمز اطلب الرمز الحالي.'],
    ['متى تضاف النقاط؟', 'تضاف نقاط الفعالية عند تأكيد حضورك، وليس بمجرد التسجيل. الحضور المكرر لا يضيف نقاطًا جديدة. المنح والتصحيح اليدوي لهما سبب في سجل النقاط.'],
    ['أين شهادتي؟', 'افتح حسابي ثم الشهادات. تتطلب الشهادة حضورًا مؤكدًا وفعالية مكتملة تدعم الشهادات. اضغط عرض الشهادة، ثم فتح الشهادة عند جاهزيتها.'],
    ['لماذا انتهى رابط الشهادة؟', 'روابط الشهادات الخاصة قصيرة الصلاحية. جهّز رابطًا جديدًا من ملفك. الروابط الخارجية تعتمد على صلاحيات الجهة المستضيفة.'],
    ['كيف أصحح الاسم أو الحضور؟', 'يمكن تعديل الاسم والبيانات من الملف. لتصحيح حضور أو نقاط، تواصل مع منظمي الفعالية واذكر اسمها ومعرف حسابك فقط؛ لا ترسل كلمة مرور أو رمز دخول.'],
    ['ما التوقيت المستخدم؟', 'تُعرض مواعيد المنصة بتوقيت الرياض (UTC+3).'],
  ] : [
    ['How do I register?', 'Open an event, sign in with Google, complete your profile, then register. Automatic registration reserves an available seat; manual requests need organizer approval.'],
    ['What does waitlisted mean?', 'A waitlist entry is not a confirmed seat. When capacity becomes available, your request may be promoted or need approval. Check your status before attending.'],
    ['How do I check in?', 'During the event, scan the organizer’s code or ask them to scan your member pass. Opening an event or registering does not confirm attendance. Ask for the current code if yours expires.'],
    ['When are points awarded?', 'Event points are awarded on confirmed attendance, not registration. Duplicate check-in does not award extra points. Manual corrections have a reason in your points history.'],
    ['Where is my certificate?', 'Open My account, then Certificates. Certificates require verified attendance and a completed event that offers them. Select View certificate, then Open certificate when it is ready.'],
    ['Why did my certificate link expire?', 'Private download links expire quickly. Generate another from your profile. External links follow the hosting service’s access settings.'],
    ['How do I correct my name or attendance?', 'Edit personal details in your profile. For attendance or points corrections, contact the event organizers with the event name and account ID, never a password or sign-in code.'],
    ['Which timezone is used?', 'Dates and times are shown in Riyadh time (UTC+3).'],
  ];
  return <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 lg:pt-28"><header className="mb-8"><h1 className="text-3xl font-black font-cairo text-slate-900">{isAr ? 'المساعدة والأسئلة الشائعة' : 'Help and frequently asked questions'}</h1><p className="mt-3 text-slate-600">{isAr ? 'خطوات واضحة من التسجيل إلى الحضور والشهادة.' : 'Your path from registration to attendance and certificates.'}</p></header><div className="space-y-3">{questions.map(([question, answer]) => <details key={question} className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold text-slate-900">{question}</summary><p className="mt-3 leading-7 text-slate-600">{answer}</p></details>)}</div><nav className="mt-8 flex flex-wrap gap-3"><Link href="/events" className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">{isAr ? 'الفعاليات' : 'Events'}</Link><Link href="/profile" className="rounded-xl border bg-white px-4 py-3 font-bold">{isAr ? 'ملفي وشهاداتي' : 'My profile and certificates'}</Link><a href="https://www.linkedin.com/company/ieee-qassim/" target="_blank" rel="noopener noreferrer" className="rounded-xl border bg-white px-4 py-3 font-bold">{isAr ? 'قناة النادي الرسمية' : 'Official club channel'}</a></nav></div>;
}

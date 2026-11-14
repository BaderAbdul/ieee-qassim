/**
 * The IEEE QU email builder, as part of the platform: its parameters, its sample defaults and the
 * generator that turns them into the table-based, inline-styled HTML email. The output is identical
 * to the standalone builder's (except one deliberate fix: a fixed title size instead of clamp(),
 * which Gmail and several other clients drop).
 */

export const PURPOSES: Record<string, string> = {
  invitation: 'دعوة', confirmation: 'تأكيد التسجيل', reminder: 'تذكير', update: 'تحديث أو تغيير',
  thankyou: 'شكر بعد الفعالية', certificate: 'إصدار شهادة', feedback: 'طلب تقييم', custom: 'رسالة مخصصة',
};
export const TIMINGS: Record<string, string> = {
  before: 'قبل الفعالية', today: 'يوم الفعالية', after: 'بعد الفعالية', rescheduled: 'تغيير الموعد', relocated: 'تغيير المكان', cancelled: 'إلغاء الفعالية',
};
export const ATTENDANCE: Record<string, string> = { inperson: 'حضوري', online: 'عن بُعد', hybrid: 'هجين', none: 'لا ينطبق' };
export const AUDIENCES: Record<string, string> = { attendees: 'المسجلون', public: 'المدعوون', members: 'الأعضاء', speakers: 'المتحدثون', volunteers: 'المنظمون' };

export interface BuilderParams {
  purpose: string; timing: string; attendance: string; audience: string;
  headline: string; eyebrow: string; subject: string; message: string;
  event: string; name: string; date: string; start: string; end: string; location: string; speaker: string; agenda: string;
  extraTitle: string; extraText: string; extraLabel: string; extraUrl: string;
  mapUrl: string; joinUrl: string; registrationUrl: string; certificateUrl: string; feedbackUrl: string; customUrl: string; customLabel: string;
  signoff: string; notice: string;
  details: boolean; agendaVisible: boolean; speakerVisible: boolean; extraVisible: boolean; mapVisible: boolean; joinVisible: boolean;
  registrationVisible: boolean; certificateVisible: boolean; feedbackVisible: boolean; customVisible: boolean; noticeVisible: boolean; footerVisible: boolean;
  headerColor: string; accentColor: string; compact: boolean;
}
export interface BuilderBlock { title: string; body: string }
export interface BuilderState { p: BuilderParams; blocks: BuilderBlock[] }

export const defaultBuilderState = (): BuilderState => ({
  p: {
    purpose: 'reminder', timing: 'today', attendance: 'inperson', audience: 'attendees', headline: '', eyebrow: '', subject: '', message: '',
    event: 'IEEE Day 2026', name: 'ضيفنا العزيز', date: '2026-10-16', start: '18:30', end: '22:00', location: 'بيت الثقافة – بريدة',
    speaker: 'م. إبراهيم المحيسن',
    agenda: '6:30 – 8:00 م | استقبال الضيوف ومعرض المشاريع\n8:00 – 9:30 م | الجلسة المميزة\n9:30 – 10:00 م | التواصل',
    extraTitle: 'قبل حضورك، خطوة بسيطة تسهّل دخولك!', extraText: 'نرجو التسجيل مسبقًا في منصة بيوت الثقافة لتسهيل إجراءات الدخول.',
    extraLabel: 'التسجيل في بيوت الثقافة', extraUrl: 'https://culturehouses.sa/ar/login/', mapUrl: 'https://maps.app.goo.gl/w6xmFbnzZ18c1CYW9?g_st=ic',
    joinUrl: '', registrationUrl: '', certificateUrl: '', feedbackUrl: '', customUrl: '', customLabel: 'اعرف المزيد',
    signoff: 'متحمسين نشوفكم، حضوركم يكمل التجربة! 💙', notice: '',
    details: true, agendaVisible: true, speakerVisible: true, extraVisible: true, mapVisible: true, joinVisible: false, registrationVisible: false,
    certificateVisible: false, feedbackVisible: false, customVisible: false, noticeVisible: false, footerVisible: true,
    headerColor: '#076494', accentColor: '#086b9a', compact: false,
  },
  blocks: [],
});

/** Merge a possibly older/partial saved state onto the defaults. */
export function normalizeBuilderState(value: unknown): BuilderState {
  const base = defaultBuilderState();
  if (!value || typeof value !== 'object') return base;
  const v = value as { p?: Partial<BuilderParams>; blocks?: unknown };
  if (!v.p || typeof v.p !== 'object') return base;
  const blocks = Array.isArray(v.blocks)
    ? v.blocks.filter((b): b is BuilderBlock => !!b && typeof (b as BuilderBlock).title === 'string' && typeof (b as BuilderBlock).body === 'string')
    : [];
  return { p: { ...base.p, ...v.p }, blocks };
}

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const safeUrl = (value: string) => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
export const isSafeUrl = (value: string) => !!safeUrl(value);

export function formatBuilderDate(value: string): string {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return new Intl.DateTimeFormat('ar-SA', { calendar: 'gregory', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date);
}

/** 12-hour Arabic clock, the same format the platform's time variables produce. */
export function formatBuilderTime(value: string): string {
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length < 2) return value;
  const hour = Number(parts[0]);
  return `${hour % 12 || 12}:${parts[1]} ${hour >= 12 ? 'مساءً' : 'صباحًا'}`;
}

const AUTO: Record<string, [string, string, string]> = {
  invitation: ['YOU ARE INVITED ✦', 'ندعوك للمشاركة', 'يسعدنا دعوتك للمشاركة في {event}. نتطلع إلى حضورك ومشاركتك.'],
  confirmation: ['REGISTRATION CONFIRMED ✦', 'تم تأكيد تسجيلك!', 'أهلًا {name}، يسعدنا تأكيد تسجيلك في {event}.'],
  reminder: ['SEE YOU SOON ✦', 'موعدنا اقترب!', 'أهلًا {name}، نذكرك بموعد {event}، ويسعدنا حضورك.'],
  update: ['IMPORTANT UPDATE ✦', 'تحديث بخصوص الفعالية', 'نود إبلاغك بتحديث مهم يخص {event}. يرجى الاطلاع على التفاصيل أدناه.'],
  thankyou: ['THANK YOU ✦', 'شكرًا لحضورك!', 'نشكرك {name} على حضور {event}، ونتطلع إلى لقائك مجددًا.'],
  certificate: ['YOUR CERTIFICATE ✦', 'شهادتك جاهزة!', 'شكرًا لك {name}، أصبحت شهادة {event} متاحة لك.'],
  feedback: ['YOUR FEEDBACK ✦', 'شاركنا رأيك', 'يسعدنا تقييمك لفعالية {event} لتطوير أنشطتنا القادمة.'],
  custom: ['IEEE QU ✦', 'مرحبًا بك', 'رسالة من فرع IEEE الطلابي بجامعة القصيم.'],
};

/** Eyebrow, headline and body the builder writes itself when those fields are left empty. */
export function authoredText(p: BuilderParams): [string, string, string] {
  let a: [string, string, string] = AUTO[p.purpose] || AUTO.custom;
  if (p.purpose === 'reminder' && p.timing === 'today') a = ['TODAY IS THE DAY ✦', 'موعدنا معكم اليوم!', 'باقي ساعات قليلة على لقائنا في {event}! يسعدنا حضورك.'];
  if (p.timing === 'cancelled') a = ['IMPORTANT NOTICE ✦', 'إلغاء الفعالية', 'نعتذر عن إلغاء {event}. نشكرك على تفهمك.'];
  if (p.timing === 'rescheduled') a = ['SCHEDULE UPDATE ✦', 'تعديل موعد الفعالية', 'تم تعديل موعد {event}، تجد تفاصيل الموعد الجديد أدناه.'];
  return a.map(text => text.replaceAll('{event}', p.event).replaceAll('{name}', p.name)) as [string, string, string];
}

export function builderSubject(p: BuilderParams): string {
  return p.subject || `رسالة بخصوص ${p.event}`;
}

/** The sample values printed in the email: what the studio offers to turn into variables. */
export function builderSamples(p: BuilderParams) {
  return { event: p.event, name: p.name, dateText: formatBuilderDate(p.date), start: formatBuilderTime(p.start), end: formatBuilderTime(p.end), location: p.location, speaker: p.speaker };
}

export function builderWarnings(p: BuilderParams): string[] {
  const warnings: string[] = [];
  if (!p.event.trim()) warnings.push('اسم الفعالية مفقود');
  if (p.mapVisible && p.attendance === 'inperson' && !safeUrl(p.mapUrl)) warnings.push('تم تفعيل زر الخريطة دون رابط صالح');
  if (p.extraVisible && p.extraUrl && !safeUrl(p.extraUrl)) warnings.push('رابط التسجيل الإضافي غير صالح');
  return warnings;
}

export function generateEmail(state: BuilderState): string {
  const p = state.p;
  const a = authoredText(p);
  const head = p.headline || a[1];
  const eyebrow = p.eyebrow || a[0];
  const body = p.message || a[2];
  const pad = p.compact ? '17px 23px' : '26px 30px';
  const tx = (value: string) => esc(value).replace(/\n/g, '<br>');
  const btn = (name: string, link: string, color: string = p.accentColor) => safeUrl(link)
    ? `<a href="${esc(safeUrl(link))}" style="display:inline-block;margin:5px;background:${esc(color)};padding:13px 21px;border-radius:9px;color:white;text-decoration:none;font-size:14px;font-weight:bold">${esc(name)}</a>` : '';
  const section = (inner: string) => `<tr><td style="padding:${pad}">${inner}</td></tr>`;
  const panel = (title: string, inner: string, color = '#eef6f8') =>
    `<div style="background:${color};border-radius:14px;padding:20px 23px;text-align:right"><strong style="color:#075b88;font-size:16px">${esc(title)}</strong><div style="line-height:2.1;color:#35546a;font-size:14px;margin-top:8px">${inner}</div></div>`;

  const lines: string[] = [];
  if (p.date) lines.push(`📅 <b>التاريخ:</b> ${esc(formatBuilderDate(p.date))}`);
  if (p.start) lines.push(`🕡 <b>الوقت:</b> ${esc(formatBuilderTime(p.start))}${p.end ? ` – ${esc(formatBuilderTime(p.end))}` : ''}`);
  if (p.attendance === 'online') lines.push('💻 <b>نوع الحضور:</b> عن بُعد');
  else if (p.attendance === 'hybrid') lines.push('📍 <b>نوع الحضور:</b> هجين');
  if (p.attendance !== 'online' && p.attendance !== 'none' && p.location) lines.push(`📍 <b>المكان:</b> ${esc(p.location)}`);

  let h = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#edf3f6;font-family:Tahoma,Arial,sans-serif;color:#163e55"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf3f6"><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:18px;overflow:hidden"><tr><td style="background:${esc(p.headerColor)};color:#fff;padding:28px;text-align:center"><div style="font-size:24px;font-weight:bold;direction:ltr;letter-spacing:1px">IEEE | Qassim University</div><div style="font-size:12px;direction:ltr;margin-top:4px">IEEE Student Branch</div></td></tr><tr><td style="text-align:center;color:#fff;padding:42px 25px;background:#128c8b;background:linear-gradient(125deg,#0873a5 0%,#168d8b 45%,#6b983d 78%,#c68e34 100%)"><div style="font-size:13px;letter-spacing:2px;font-weight:bold">${esc(eyebrow)}</div><h1 style="font-size:34px;margin:20px 0 10px;line-height:1.35;color:white">${esc(p.event)}</h1><div style="font-size:21px;font-weight:bold">${esc(head)}</div></td></tr>`;

  h += section(`<h2 style="font-size:18px;color:#163e55;margin:0 0 12px">${esc(head)}</h2><div style="font-size:15px;line-height:2;color:#35546a">${tx(body)}</div>`);
  if (p.noticeVisible && p.notice) h += section(panel('تنبيه مهم', tx(p.notice), '#fff5de'));
  if (p.details && lines.length) h += section(panel('تفاصيل الفعالية', lines.join('<br>')));
  if (p.agendaVisible && p.agenda) h += section(`<div style="color:#075b88;font-weight:bold;font-size:16px;margin-bottom:12px">من برنامجنا:</div><div style="font-size:14px;line-height:2;color:#35546a">${tx(p.agenda)}</div>`);
  if (p.speakerVisible && p.speaker) h += section(panel('ضيف الفعالية', tx(p.speaker)));
  if (p.extraVisible && (p.extraTitle || p.extraText)) {
    h += section(panel(p.extraTitle || 'متطلبات الحضور', tx(p.extraText) + (safeUrl(p.extraUrl) ? `<div style="text-align:center;margin-top:17px">${btn(p.extraLabel, p.extraUrl, '#176e61')}</div>` : ''), '#eaf5ef'));
  }
  for (const block of state.blocks) if (block.title || block.body) h += section(panel(block.title || 'معلومات إضافية', tx(block.body)));

  let links = '';
  if (p.timing !== 'cancelled') {
    if (p.mapVisible && p.attendance !== 'online' && p.attendance !== 'none') links += btn('📍 الموقع على الخريطة', p.mapUrl);
    if (p.joinVisible) links += btn('💻 رابط الانضمام', p.joinUrl);
    if (p.registrationVisible) links += btn('سجّل الآن', p.registrationUrl);
    if (p.certificateVisible) links += btn('عرض الشهادة', p.certificateUrl);
    if (p.feedbackVisible) links += btn('شاركنا تقييمك', p.feedbackUrl);
    if (p.customVisible) links += btn(p.customLabel, p.customUrl);
  }
  if (links) h += section(`<div style="text-align:center">${links}</div>`);
  if (p.signoff) h += section(`<div style="text-align:center;color:#176b7f;font-size:15px">${tx(p.signoff)}</div>`);
  if (p.footerVisible) h += `<tr><td bgcolor="${esc(p.headerColor)}" style="background:${esc(p.headerColor)};color:#fff;text-align:center;padding:24px;font-size:12px;direction:ltr;font-weight:bold">IEEE Qassim University Student Branch</td></tr>`;
  return `${h}</table></td></tr></table></body></html>`;
}

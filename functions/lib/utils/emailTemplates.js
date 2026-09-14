"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailHtml = getEmailHtml;
function getEmailHtml(template, data) {
    const content = getTemplateContent(template, data);
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IEEE Qassim University</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f9fafb;
          color: #1f2937;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin-top: 40px;
          margin-bottom: 40px;
        }
        .header {
          background-color: #00629B; /* IEEE Blue */
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 32px 24px;
        }
        .text-block {
          margin-bottom: 24px;
        }
        .text-rtl {
          direction: rtl;
          text-align: right;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .text-ltr {
          direction: ltr;
          text-align: left;
        }
        .divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 24px 0;
        }
        .footer {
          background-color: #f3f4f6;
          padding: 24px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
        .button {
          display: inline-block;
          background-color: #00629B;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>IEEE QU Student Branch</h1>
        </div>
        <div class="content">
          <div class="text-block text-rtl">
            <h2 style="margin-top: 0;">${content.ar.title}</h2>
            <p>${content.ar.body}</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="text-block text-ltr">
            <h2 style="margin-top: 0;">${content.en.title}</h2>
            <p>${content.en.body}</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} IEEE Qassim University Student Branch. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
function getTemplateContent(template, data) {
    const eventName = data.eventTitle || data.eventName || 'the event';
    switch (template) {
        case 'REGISTRATION_RECEIVED':
            return {
                ar: {
                    title: 'تم استلام طلب التسجيل',
                    body: `مرحباً، لقد استلمنا طلب تسجيلك في فعالية <strong>${eventName}</strong>. طلبك الآن قيد المراجعة وسنعلمك بالنتيجة قريباً.`,
                },
                en: {
                    title: 'Registration Received',
                    body: `Hello, we have received your registration request for <strong>${eventName}</strong>. Your request is currently under review and we will notify you of the result soon.`,
                }
            };
        case 'REGISTRATION_APPROVED':
            return {
                ar: {
                    title: 'تم قبول طلب التسجيل',
                    body: `مرحباً، يسعدنا إخبارك بأنه تم قبول طلب تسجيلك في فعالية <strong>${eventName}</strong>. نتطلع لرؤيتك!`,
                },
                en: {
                    title: 'Registration Approved',
                    body: `Hello, we are pleased to inform you that your registration for <strong>${eventName}</strong> has been approved. We look forward to seeing you!`,
                }
            };
        case 'REGISTRATION_WAITLISTED':
            return {
                ar: {
                    title: 'تم إضافتك لقائمة الانتظار',
                    body: `مرحباً، نظراً لاكتمال المقاعد، تم إضافتك لقائمة الانتظار لفعالية <strong>${eventName}</strong>. سنعلمك في حال توفر مقعد لك.`,
                },
                en: {
                    title: 'Added to Waitlist',
                    body: `Hello, due to capacity limits, you have been added to the waitlist for <strong>${eventName}</strong>. We will notify you if a seat becomes available.`,
                }
            };
        case 'REGISTRATION_REJECTED':
            return {
                ar: {
                    title: 'تحديث حالة التسجيل',
                    body: `مرحباً، نعتذر لإخبارك بأنه لم يتم قبول طلب تسجيلك في فعالية <strong>${eventName}</strong>. نتمنى رؤيتك في فعالياتنا القادمة.`,
                },
                en: {
                    title: 'Registration Update',
                    body: `Hello, we regret to inform you that your registration for <strong>${eventName}</strong> could not be approved at this time. We hope to see you at our future events.`,
                }
            };
        case 'REGISTRATION_CANCELLED':
            return {
                ar: {
                    title: 'تم إلغاء التسجيل',
                    body: `مرحباً، لقد تم إلغاء تسجيلك في فعالية <strong>${eventName}</strong> بنجاح.`,
                },
                en: {
                    title: 'Registration Cancelled',
                    body: `Hello, your registration for <strong>${eventName}</strong> has been successfully cancelled.`,
                }
            };
        case 'ATTENDANCE_CONFIRMATION':
            return {
                ar: {
                    title: 'تأكيد الحضور',
                    body: `مرحباً، تم تسجيل حضورك لفعالية <strong>${eventName}</strong> بنجاح. شكراً لحضورك ومشاركتك!`,
                },
                en: {
                    title: 'Attendance Confirmed',
                    body: `Hello, your attendance for <strong>${eventName}</strong> has been successfully recorded. Thank you for participating!`,
                }
            };
        case 'CERTIFICATE_AVAILABLE':
            return {
                ar: {
                    title: 'الشهادة متاحة الآن',
                    body: `مرحباً، شهادة حضورك لفعالية <strong>${eventName}</strong> متاحة الآن للتحميل عبر حسابك في المنصة.<br><br><a href="https://ieee-qu.com/my-activity" class="button">عرض الشهادة</a>`,
                },
                en: {
                    title: 'Certificate Available',
                    body: `Hello, your attendance certificate for <strong>${eventName}</strong> is now available to download from your account.<br><br><a href="https://ieee-qu.com/my-activity" class="button">View Certificate</a>`,
                }
            };
        case 'CERTIFICATE_REVOKED':
            return {
                ar: {
                    title: 'تحديث حالة الشهادة',
                    body: `مرحباً، تم سحب شهادة حضورك لفعالية <strong>${eventName}</strong>. يرجى التواصل معنا في حال وجود أي استفسار.`,
                },
                en: {
                    title: 'Certificate Update',
                    body: `Hello, your attendance certificate for <strong>${eventName}</strong> has been revoked. Please contact us if you have any questions.`,
                }
            };
        case 'EVENT_REMINDER':
            return {
                ar: {
                    title: 'تذكير بفعالية قادمة',
                    body: `مرحباً، نود تذكيرك بأن فعالية <strong>${eventName}</strong> ستبدأ غداً. نتطلع لرؤيتك!`,
                },
                en: {
                    title: 'Upcoming Event Reminder',
                    body: `Hello, this is a friendly reminder that <strong>${eventName}</strong> starts tomorrow. We look forward to seeing you!`,
                }
            };
        default:
            return {
                ar: { title: 'إشعار من منصة IEEE', body: `إشعار بخصوص فعالية ${eventName}.` },
                en: { title: 'IEEE Platform Notification', body: `Notification regarding ${eventName}.` },
            };
    }
}
//# sourceMappingURL=emailTemplates.js.map
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as fs from 'fs';
import * as path from 'path';

export const generateCertificate = onDocumentWritten(
  {
    document: 'certificates/{certificateId}',
    memory: '1GiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const snap = event.data?.after;
    if (!snap || !snap.exists) return; // Document deleted

    const data = snap.data() || {};
    if (data.status !== 'Generating') {
      return; // Only process when status is Generating
    }

    const eventId = data.eventId;
    const userId = data.userId;
    const studentName = data.studentName;
    const eventTitle = data.eventTitle;
    const storagePath = data.storagePath;
    const db = admin.firestore();
    const certRef = db.collection('certificates').doc(event.params.certificateId);

    try {
      // Load fonts as base64
      const fontRegularPath = path.join(__dirname, '../../src/assets/fonts/Cairo-Regular.ttf');
      const fontBoldPath = path.join(__dirname, '../../src/assets/fonts/Cairo-Bold.ttf');
      const cairoRegularBase64 = fs.readFileSync(fontRegularPath).toString('base64');
      const cairoBoldBase64 = fs.readFileSync(fontBoldPath).toString('base64');

      // 1. Generate HTML for the certificate
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <style>
            @font-face {
              font-family: 'Cairo';
              src: url(data:font/truetype;charset=utf-8;base64,${cairoRegularBase64}) format('truetype');
              font-weight: 400;
              font-style: normal;
            }
            @font-face {
              font-family: 'Cairo';
              src: url(data:font/truetype;charset=utf-8;base64,${cairoBoldBase64}) format('truetype');
              font-weight: 700;
              font-style: normal;
            }
            body {
              font-family: 'Cairo', sans-serif;
              margin: 0;
              padding: 0;
              width: 297mm;
              height: 210mm;
              background-color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .certificate {
              border: 10px solid #1e3a8a;
              width: 90%;
              height: 90%;
              background: white;
              padding: 40px;
              text-align: center;
              box-sizing: border-box;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #1e3a8a; font-size: 48px; margin-bottom: 20px; }
            h2 { color: #3b82f6; font-size: 36px; margin-top: 40px; }
            p { font-size: 24px; color: #475569; }
            .cert-id { font-size: 14px; color: #94a3b8; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1>شهادة حضور</h1>
            <p>تشهد المنصة بأن</p>
            <h2>${studentName}</h2>
            <p>قد حضر/ت فعالية</p>
            <h2 style="color: #0f172a;">${eventTitle}</h2>
            <div class="cert-id">رقم الشهادة: ${event.params.certificateId}</div>
          </div>
        </body>
        </html>
      `;

      // 2. Launch Puppeteer
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });

      // 3. Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
      });

      await browser.close();

      // 4. Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            certificateId: event.params.certificateId,
            eventId,
            userId,
          }
        }
      });

      // 5. Update Status
      await certRef.update({
        status: 'Available',
        issueDate: FieldValue.serverTimestamp(),
        attemptCount: FieldValue.increment(1),
      });

      console.log(`Certificate ${event.params.certificateId} generated successfully.`);
    } catch (error: any) {
      console.error(`Error generating certificate ${event.params.certificateId}:`, error);
      
      // Update status to Failed
      await certRef.update({
        status: 'Failed',
        lastError: error.message || 'Unknown error during PDF generation',
        attemptCount: FieldValue.increment(1),
      });
    }
  }
);

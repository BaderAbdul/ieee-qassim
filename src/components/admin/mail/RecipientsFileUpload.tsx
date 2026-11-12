'use client';

import { useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { looksLikeEmail, parseCSV } from '@/lib/csv';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';

export default function RecipientsFileUpload({ isAr, onExtracted }: {
  isAr: boolean; onExtracted: (emails: string[]) => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [columnIndex, setColumnIndex] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [error, setError] = useState('');

  const openFile = async (file: File) => {
    setError('');
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (!parsed.length) throw new Error(t('الملف فارغ.', 'The file is empty.'));
      setRows(parsed);
      setFileName(file.name);
      setColumnIndex(0);
      setHasHeader(parsed[0].some(cell => !looksLikeEmail(cell)));
    } catch {
      setError(t('تعذرت قراءة الملف. يجب أن يكون بصيغة CSV.', 'Could not read the file. It must be a .csv file.'));
    }
  };

  const extracted = rows ? rows.slice(hasHeader ? 1 : 0)
    .map(r => (r[columnIndex] || '').trim())
    .filter(looksLikeEmail) : [];

  return <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-border)] p-4">
    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[var(--color-accent)]">
      <Upload size={16} />
      {t('رفع ملف CSV يحتوي على عناوين البريد', 'Upload a CSV file with email addresses')}
      <input type="file" accept=".csv,text/csv" className="hidden"
             onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void openFile(file); }} />
    </label>
    <p className="text-xs text-[var(--color-text-muted)]">
      {t('صدّر ورقة Excel كـ CSV (ملف ← حفظ باسم ← CSV) ثم ارفعها هنا.', 'Export your Excel sheet as CSV (File → Save As → CSV), then upload it here.')}
    </p>
    {error && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    {rows && (
      <div className="space-y-2 rounded-lg bg-[var(--color-surface)] p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]"><FileSpreadsheet size={14} />{fileName}</p>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />{t('الصف الأول عنوان الأعمدة', 'First row is a header')}</label>
        <label className="block space-y-1 text-xs font-bold text-[var(--color-text-secondary)]">
          <span>{t('العمود الذي يحتوي على البريد الإلكتروني', 'Column that holds the email address')}</span>
          <select className={input} value={columnIndex} onChange={e => setColumnIndex(Number(e.target.value))}>
            {rows[0].map((_, i) => (
              <option key={i} value={i}>{hasHeader ? (rows[0][i] || `${t('عمود', 'Column')} ${i + 1}`) : `${t('عمود', 'Column')} ${i + 1}`}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--color-text-secondary)]">{t('تم العثور على', 'Found')} <strong>{extracted.length}</strong> {t('عنوان بريد صالح.', 'valid email addresses.')}</p>
        <button type="button" disabled={!extracted.length} onClick={() => onExtracted(extracted)}
                className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-xs font-bold text-[var(--color-accent-contrast)] disabled:opacity-50">
          {t('إضافة هذه العناوين', 'Add these addresses')}
        </button>
      </div>
    )}
  </div>;
}

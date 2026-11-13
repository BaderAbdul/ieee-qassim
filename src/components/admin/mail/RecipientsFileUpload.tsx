'use client';

import { useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { looksLikeEmail, parseCSV } from '@/lib/csv';
import { useToast } from '@/context/ToastContext';

const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';

export default function RecipientsFileUpload({ isAr, onExtracted }: {
  isAr: boolean; onExtracted: (emails: string[]) => void;
}) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState('');
  const [columnIndex, setColumnIndex] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);

  const openFile = async (file: File) => {
    try {
      const isXlsx = /\.xlsx$/i.test(file.name);
      const parsed = isXlsx
        ? (await readSheet(file)).map(row => row.map(cell => cell == null ? '' : String(cell)))
        : parseCSV(await file.text());
      if (!parsed.length) throw new Error(t('الملف فارغ.', 'The file is empty.'));
      setRows(parsed);
      setFileName(file.name);
      setColumnIndex(0);
      setHasHeader(parsed[0].some(cell => !looksLikeEmail(cell)));
    } catch {
      showToast(t('تعذرت قراءة الملف. يجب أن يكون بصيغة Excel (.xlsx) أو CSV.', 'Could not read the file. It must be an Excel (.xlsx) or .csv file.'), 'error');
    }
  };

  const extracted = rows ? rows.slice(hasHeader ? 1 : 0)
    .map(r => (r[columnIndex] || '').trim())
    .filter(looksLikeEmail) : [];

  return <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-border)] p-4">
    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[var(--color-accent)]">
      <Upload size={16} />
      {t('رفع ملف Excel أو CSV يحتوي على عناوين البريد', 'Upload an Excel or CSV file with email addresses')}
      <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden"
             onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void openFile(file); }} />
    </label>
    <p className="text-xs text-[var(--color-text-muted)]">
      {t('يدعم ملفات Excel بصيغة .xlsx وكذلك CSV.', 'Supports Excel (.xlsx) files as well as CSV.')}
    </p>
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

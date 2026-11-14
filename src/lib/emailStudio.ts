import { EMAIL_VARIABLE_GROUPS, variableToken } from './emailTemplates';

export const KNOWN_VARIABLES = new Set(EMAIL_VARIABLE_GROUPS.flatMap(group => group.variables.map(variable => variable.source)));
const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g;

/** Same escaping the builder applies to every value it prints, so literal values can be found in its HTML. */
export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

export function countOccurrences(html: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  for (let at = html.indexOf(needle); at !== -1; at = html.indexOf(needle, at + needle.length)) count += 1;
  return count;
}

/** Replace a literal text with a variable token, in text AND attribute positions, matching escaped and raw forms. */
export function replaceLiteral(html: string, literal: string, variable: string): { html: string; replaced: number } {
  const token = variableToken(variable);
  let replaced = 0;
  let next = html;
  for (const form of new Set([escapeHtml(literal), literal])) {
    if (!form) continue;
    const found = countOccurrences(next, form);
    if (found) { replaced += found; next = next.split(form).join(token); }
  }
  return { html: next, replaced };
}

export interface StudioSamples { event: string; name: string; dateText: string; start: string; end: string; location: string; speaker: string }

export interface Candidate { id: string; label: string; literal: string; variable: string; count: number }

const hasArabic = (value: string) => /[؀-ۿ]/.test(value);

/** The sample data the builder printed that the platform can supply per recipient/event instead. */
export function detectCandidates(html: string, samples: StudioSamples): Candidate[] {
  const rows: Omit<Candidate, 'count'>[] = [
    { id: 'event', label: 'اسم الفعالية', literal: samples.event, variable: hasArabic(samples.event) ? 'event.ar.name' : 'event.en.name' },
    { id: 'name', label: 'اسم المستلم', literal: samples.name, variable: 'student.name' },
    { id: 'date', label: 'تاريخ الفعالية', literal: samples.dateText, variable: 'event.ar.date' },
    { id: 'start', label: 'وقت البداية', literal: samples.start, variable: 'event.startingTime' },
    { id: 'end', label: 'وقت النهاية', literal: samples.end, variable: 'event.endingTime' },
    { id: 'location', label: 'المكان', literal: samples.location, variable: hasArabic(samples.location) ? 'event.ar.location' : 'event.en.location' },
    { id: 'speaker', label: 'المتحدث', literal: samples.speaker, variable: hasArabic(samples.speaker) ? 'event.ar.speakers' : 'event.en.speakers' },
  ];
  return rows
    .map(row => ({ ...row, count: Math.max(countOccurrences(html, escapeHtml(row.literal)), countOccurrences(html, row.literal)) }))
    .filter(row => row.literal.trim() && row.count > 0);
}

const ARABIC_MONTHS = 'يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر';
const ENGLISH_MONTHS = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
const HARDCODED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'وقت', re: /\b\d{1,2}:\d{2}(?:\s*(?:صباحًا|مساءً|ص|م|AM|PM))?/g },
  { label: 'تاريخ', re: new RegExp(`\\b\\d{1,2}\\s+(?:${ARABIC_MONTHS}|${ENGLISH_MONTHS})[,\\s]*\\d{0,4}`, 'gi') },
  { label: 'سنة', re: /\b20\d{2}\b/g },
];

const visibleText = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/** Things in the visible text that still look like hard-coded event data (times, dates, years). */
export function scanHardcoded(html: string): { label: string; text: string }[] {
  const text = visibleText(html.replace(TOKEN_RE, ' '));
  const found = new Map<string, { label: string; text: string }>();
  for (const { label, re } of HARDCODED_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const snippet = match[0].trim().replace(/[,\s]+$/, '');
      if (snippet && !found.has(snippet) && ![...found.keys()].some(existing => existing.includes(snippet))) found.set(snippet, { label, text: snippet });
    }
  }
  return [...found.values()].slice(0, 8);
}

export function usedVariables(...sources: string[]): string[] {
  const used = new Set<string>();
  for (const source of sources) for (const match of source.matchAll(TOKEN_RE)) used.add(match[1]);
  return [...used];
}

export const unknownVariables = (...sources: string[]) => usedVariables(...sources).filter(key => !KNOWN_VARIABLES.has(key));

/** Preview copy only: shows each variable as a highlighted chip, touching text nodes but never tags/attributes. */
export function highlightVariables(html: string): string {
  return html.split(/(<[^>]*>)/).map(part => part.startsWith('<') ? part : part.replace(TOKEN_RE, (_whole, key: string) =>
    `<span style="display:inline-block;direction:ltr;background:#fde68a;color:#92400e;border-radius:5px;padding:0 5px;font:600 0.8em/1.6 monospace">${key}</span>`)).join('');
}

export const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/** First block of the email body in the builder's markup: the main message. */
const BODY_OPEN = '<div style="font-size:15px;line-height:2;color:#35546a">';

/** Adds "أهلًا {{ student.name }}،" above the main message so every recipient is greeted by their own name. */
export function addGreeting(html: string, variable: 'student.name' | 'student.firstName'): { html: string; added: boolean } {
  const at = html.indexOf(BODY_OPEN);
  if (at === -1) return { html, added: false };
  const insert = at + BODY_OPEN.length;
  return { html: `${html.slice(0, insert)}<strong>أهلًا ${variableToken(variable)}،</strong><br>${html.slice(insert)}`, added: true };
}

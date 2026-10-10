/** RFC 4180-style CSV parsing, including quoted commas, escaped quotes and newlines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error('Invalid CSV quotation');
      quoted = true;
    } else if (char === ',') { row.push(field); field = ''; closed = false; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = []; field = ''; closed = false;
    } else if (closed && !/\s/.test(char)) throw new Error('Invalid characters after quoted CSV field');
    else if (!closed) field += char;
  }
  if (quoted) throw new Error('Unclosed CSV quotation');
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function serializeCSV(rows: readonly (readonly unknown[])[]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value ?? '');
    // Prevent spreadsheet formula execution, including leading whitespace/control bytes.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}

export function downloadCSV(filename: string, rows: readonly (readonly unknown[])[]) {
  const url = URL.createObjectURL(new Blob([serializeCSV(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function secureCertificateURL(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) throw new Error('يلزم رابط HTTPS صحيح دون بيانات دخول');
  return url.href;
}

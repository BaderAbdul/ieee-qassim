import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, serializeCSV, secureCertificateURL } from '../src/lib/csv.ts';
import { registrationAction, runOperations } from '../src/lib/admin-operations.ts';

test('CSV parses quoted commas, newlines, escaped quotes and BOM', () => {
  assert.deepEqual(parseCSV('\uFEFFName,Email\r\n"A, B","a@example.org"\r\n"line\none","a""b"'), [['Name', 'Email'], ['A, B', 'a@example.org'], ['line\none', 'a"b']]);
});
test('CSV rejects malformed quotes instead of assigning shifted links', () => {
  assert.throws(() => parseCSV('name,"unclosed'));
  assert.throws(() => parseCSV('"name"x,email'));
});
test('CSV export escapes content and prevents spreadsheet formulas', () => {
  const text = serializeCSV([['=IMPORTXML("url")', '  +cmd', '@attack', '-100', 'a,"b', '\tattack']]);
  const values = parseCSV(text)[0];
  assert.equal(values[0], '\'=IMPORTXML("url")');
  assert.equal(values[1], "'  +cmd");
  assert.equal(values[2], "'@attack");
  assert.equal(values[3], "'-100");
  assert.equal(values[4], 'a,"b');
  assert.equal(values[5], "'\tattack");
});
test('certificate URLs require HTTPS without embedded credentials', () => {
  assert.equal(secureCertificateURL(' https://example.org/a.pdf '), 'https://example.org/a.pdf');
  for (const url of ['http://example.org/a', 'javascript:alert(1)', 'https://user:secret@example.org/a']) assert.throws(() => secureCertificateURL(url));
});
test('waitlist mapping cannot silently become rejection', () => {
  assert.equal(registrationAction('waitlisted'), 'waitlist');
  assert.equal(registrationAction('approved'), 'approve');
  assert.throws(() => registrationAction('typo'));
});
test('bulk operations retain all partial outcomes and retry only failed', async () => {
  const calls: string[] = [];
  const items = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }, { id: '3', name: 'C' }];
  const results = await runOperations(items, async item => { calls.push(item.id); if (item.id === '2') throw new Error('retry'); });
  assert.deepEqual(calls, ['1', '2', '3']);
  assert.deepEqual(results.map(item => item.success), [true, false, true]);
  await runOperations(items.filter(item => results.some(result => result.id === item.id && !result.success)), async item => { calls.push(item.id); });
  assert.deepEqual(calls, ['1', '2', '3', '2']);
});

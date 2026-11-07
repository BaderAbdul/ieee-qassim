import test from 'node:test';
import assert from 'node:assert/strict';
import { arabicTemplateName, fieldText, newField, testSources, qrGeometry } from '../src/lib/certificateTemplates.ts';

test('Arabic-only names reject mixed-language input', () => {
  assert.ok(arabicTemplateName('شهادة حضور ورشة عمل'));
  assert.equal(arabicTemplateName('شهادة Certificate'), false);
  assert.equal(arabicTemplateName('   '), false);
});

test('gender conditions and unspecified fallback match server behavior', () => {
  const field = newField('conditional');
  field.fallback = 'المشارك';
  assert.equal(fieldText(field, { 'student.gender': 'male' }), 'الطالب');
  assert.equal(fieldText(field, { 'student.gender': 'female' }), 'الطالبة');
  assert.equal(fieldText(field, { 'student.gender': '' }), 'المشارك');
});

test('duplicate conditions use the first match and do not interpolate executable code', () => {
  const field = newField('conditional');
  field.rules = [{ equals: 'male', text: 'الأول' }, { equals: 'male', text: '${alert(1)}' }];
  assert.equal(fieldText(field, { 'student.gender': 'male' }), 'الأول');
  assert.equal(fieldText({ ...field, source: 'literal', value: '${alert(1)}' }, {}), '${alert(1)}');
});

test('certificate QR always encodes the certificate ID used by the text field', () => {
  const qr = newField('certificate.QR');
  const id = newField('certificate.UUID');
  const values = { 'certificate.UUID': 'test-certificate-id', 'certificate.QR': 'unrelated-value' };
  assert.equal(fieldText(qr, values), fieldText(id, values));
  assert.equal(fieldText(qr, {}), '');
  assert.equal(qr.qrSize, 80);
});

test('event date and partner name work as text and conditional context', () => {
  const values = { 'event.date': '2026-11-07', 'partner.name': 'Test partner' };
  assert.equal(fieldText(newField('event.date'), values), '2026-11-07');
  assert.equal(fieldText(newField('partner.name'), values), 'Test partner');
  const logic = { ...newField('conditional'), conditionSource: 'partner.name' as const, rules: [{ equals: 'Test partner', text: 'Thank you' }] };
  assert.equal(fieldText(logic, values), 'Thank you');
});

test('preview only asks for used sources, including condition and QR dependencies', () => {
  assert.deepEqual(testSources([newField('student.name')]), ['student.name']);
  assert.deepEqual(testSources([newField('student.name'), newField('conditional'), newField('certificate.QR')]), ['student.name', 'student.gender', 'certificate.UUID']);
  assert.ok(!testSources([newField('student.name')]).includes('partner.name'));
  assert.deepEqual(testSources([newField('partner.name')]), ['partner.name']);
  assert.deepEqual(testSources([newField('event.title'), newField('event.name')]), ['event.name']);
  assert.equal(fieldText(newField('event.title'), { 'event.name': 'Workshop' }), 'Workshop');
});

test('circular QR frame contains the square code without clipping its corners', () => {
  const field = { ...newField('certificate.QR'), qrShape: 'circle' as const, qrSize: 120, qrBorderWidth: 3, qrPadding: 5 };
  const { inset, inner } = qrGeometry(field);
  assert.ok(inner * Math.sqrt(2) < 120 - 6);
  assert.ok(Math.abs(inset * 2 + inner - 120) < 1e-8);
});

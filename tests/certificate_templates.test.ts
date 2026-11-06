import test from 'node:test';
import assert from 'node:assert/strict';
import { arabicTemplateName, fieldText, newField } from '../src/lib/certificateTemplates.ts';

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

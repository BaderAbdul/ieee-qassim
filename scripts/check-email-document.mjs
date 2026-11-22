import assert from 'node:assert/strict';
import { replaceEmailBody } from '../src/lib/emailDocument.ts';

const source = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>p{direction:rtl;color:#123456}</style></head><body style="margin:0;font-family:Tahoma"><p dir="auto">مرحبًا Ahmed — IEEE Qassim</p></body></html>';
const edited = replaceEmailBody(source, '<p dir="auto">مرحبًا Ahmed — IEEE Qassim updated</p>');
assert.equal(edited, source.replace('IEEE Qassim</p>', 'IEEE Qassim updated</p>'));
assert.equal(replaceEmailBody(source, '<p dir="auto">مرحبًا Ahmed — IEEE Qassim</p>'), source);
assert.equal(replaceEmailBody('<p dir="rtl">مرحبا IEEE</p>', '<p dir="rtl">مرحبا Ahmed</p>'), '<p dir="rtl">مرحبا Ahmed</p>');
console.log('Email document: full HTML, RTL, styles and fragment editing preserved.');

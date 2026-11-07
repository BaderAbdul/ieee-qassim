'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fieldText, qrGeometry, type TemplateField } from '@/lib/certificateTemplates';

export default function CertificateFieldPreview({ field, values, height, selected, editing }: {
  field: TemplateField; values: Record<string, string>; height: number; selected: boolean; editing: boolean;
}) {
  const value = fieldText(field, values) || (editing && field.source !== 'certificate.QR' ? `[${field.label}]` : '');
  const measuredText = useRef<SVGTextElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  useEffect(() => {
    let active = true;
    const measure = () => { if (active && measuredText.current) setMeasuredWidth(measuredText.current.getComputedTextLength()); };
    measure(); void document.fonts.ready.then(measure);
    return () => { active = false; };
  }, [value, field.fontSize, field.bold, field.direction]);
  const x = field.x * 842 / 100, y = field.y * height / 100;
  if (field.source === 'certificate.QR') {
    const size = field.qrSize ?? 80, border = field.qrBorderWidth ?? 0;
    const left = x - (field.align === 'left' ? 0 : field.align === 'right' ? size : size / 2);
    const { inset, inner } = qrGeometry(field);
    const shape = (fill: string, opacity: number, stroke: string, strokeWidth: number) => field.qrShape === 'circle'
      ? <circle cx={size / 2} cy={size / 2} r={(size - border) / 2} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={strokeWidth} />
      : <rect x={border / 2} y={border / 2} width={size - border} height={size - border} rx={field.qrShape === 'rounded' ? size * .12 : 0} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={strokeWidth} />;
    return <g transform={`translate(${left}, ${y - size / 2})`}>
      {shape(field.qrBackground ?? '#ffffff', field.qrBackgroundOpacity ?? 1, field.qrBorderColor ?? '#000000', border)}
      {inner >= 12 && value && <svg x={inset} y={inset} width={inner} height={inner} viewBox={`0 0 ${inner} ${inner}`}>
        <QRCodeSVG value={value} size={inner} bgColor="transparent" fgColor={field.qrForeground ?? '#000000'} level={field.qrLevel ?? 'M'} marginSize={4} boostLevel={false} />
      </svg>}
      <rect width={size} height={size} fill="transparent" stroke={selected ? '#38bdf8' : 'none'} strokeWidth={2} />
    </g>;
  }
  const limit = field.maxWidth ? 842 * field.maxWidth / 100 : undefined;
  const size = limit && measuredWidth > limit ? field.fontSize * limit / measuredWidth : field.fontSize;
  // SVG start/end depend on direction. Keep the anchor physical when switching RTL/LTR.
  const firstLetter = value.match(/\p{L}/u)?.[0] ?? '';
  const direction = !field.direction || field.direction === 'auto' ? (/[\u0600-\u06ff]/u.test(firstLetter) ? 'rtl' : 'ltr') : field.direction;
  const rtl = direction === 'rtl';
  const anchor = field.align === 'center' ? 'middle' : (field.align === 'left') !== rtl ? 'start' : 'end';
  const boxLeft = x - (field.align === 'left' ? 0 : field.align === 'right' ? (limit || measuredWidth) : (limit || measuredWidth) / 2);
  const style = { fontFamily: 'var(--font-cairo), sans-serif', direction, unicodeBidi: 'isolate' as const, userSelect: 'none' as const };
  return <g>
    {editing && limit && <rect x={boxLeft} y={y - field.fontSize * .8} width={limit} height={field.fontSize * 1.6} fill="transparent" stroke={selected ? '#38bdf8' : '#94a3b8'} strokeDasharray="5 3" strokeWidth={1} />}
    <text ref={measuredText} fontSize={field.fontSize} fontWeight={field.bold ? 700 : 400} style={style} visibility="hidden" aria-hidden="true" pointerEvents="none">{value}</text>
    <text x={x} y={y} dominantBaseline="central" textAnchor={anchor} fontSize={size} fontWeight={field.bold ? 700 : 400} fill={field.color} style={style}>{value}</text>
  </g>;
}

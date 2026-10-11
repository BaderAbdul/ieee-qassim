import type { EventType, RegistrationMode } from './types';

/** Preparation presets only: never copy identity, schedule, points, counters or publishing state. */
export const eventTemplates: { id: string; label: string; labelEn: string; type: EventType; durationHours: number; registrationMode: RegistrationMode }[] = [
  { id: 'workshop', label: 'ورشة عمل تطبيقية', labelEn: 'Hands-on workshop', type: 'Workshop', durationHours: 2, registrationMode: 'Auto' },
  { id: 'lecture', label: 'محاضرة قصيرة', labelEn: 'Short lecture', type: 'Lecture', durationHours: 1, registrationMode: 'Auto' },
  { id: 'competition', label: 'مسابقة بموافقة المنظم', labelEn: 'Competition with organizer approval', type: 'Competition', durationHours: 3, registrationMode: 'Manual' },
];

export function eventTemplatePatch(id: string) {
  const template = eventTemplates.find(item => item.id === id);
  if (!template) throw new Error('Unknown preparation template.');
  return { type: template.type, durationHours: template.durationHours, registrationMode: template.registrationMode };
}

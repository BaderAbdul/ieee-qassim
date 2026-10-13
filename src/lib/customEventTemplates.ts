import type { EventType, RegistrationMode, CustomQuestion, PlatformEvent } from './types';

export interface CustomEventTemplate {
  id: string;
  name: string;
  description?: string;
  descriptionEn?: string;
  type: EventType;
  durationHours: number;
  capacity?: number;
  isUnlimitedCapacity?: boolean;
  hideExactCapacity?: boolean;
  points: number;
  hasCertificate: boolean;
  requiresRegistration: boolean;
  isUnlisted?: boolean;
  registrationMode: RegistrationMode;
  location?: string;
  locationEn?: string;
  gains?: string[];
  gainsEn?: string[];
  speakers?: string[];
  feedbackQuestions?: CustomQuestion[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ieee_custom_event_templates_v1';

export function getCustomEventTemplates(): CustomEventTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load custom event templates', error);
    return [];
  }
}

export function saveCustomEventTemplate(
  data: Omit<CustomEventTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): CustomEventTemplate {
  const templates = getCustomEventTemplates();
  const now = Date.now();

  let target: CustomEventTemplate;

  if (data.id) {
    const existingIndex = templates.findIndex(t => t.id === data.id);
    if (existingIndex >= 0) {
      target = {
        ...templates[existingIndex],
        ...data,
        updatedAt: now,
      };
      templates[existingIndex] = target;
    } else {
      target = {
        ...data,
        id: data.id,
        createdAt: now,
        updatedAt: now,
      };
      templates.unshift(target);
    }
  } else {
    target = {
      ...data,
      id: `tmpl_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    templates.unshift(target);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      window.dispatchEvent(new Event('ieee-event-templates-updated'));
    } catch (e) {
      console.error('Failed to save event template', e);
    }
  }

  return target;
}

export function deleteCustomEventTemplate(id: string): CustomEventTemplate[] {
  const current = getCustomEventTemplates();
  const updated = current.filter(t => t.id !== id);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('ieee-event-templates-updated'));
    } catch (e) {
      console.error('Failed to delete event template', e);
    }
  }

  return updated;
}

export function createTemplateFromEvent(
  event: Partial<PlatformEvent> & { title: string },
  customName?: string
): CustomEventTemplate {
  const name = customName?.trim() || `قالب: ${event.title}`;
  
  return saveCustomEventTemplate({
    name,
    description: event.description || '',
    descriptionEn: event.descriptionEn || '',
    type: event.type || 'Workshop',
    durationHours: event.durationHours || 2,
    capacity: event.capacity ?? 50,
    isUnlimitedCapacity: !!event.isUnlimitedCapacity,
    hideExactCapacity: !!event.hideExactCapacity,
    points: event.points ?? 10,
    hasCertificate: !!event.hasCertificate,
    requiresRegistration: event.requiresRegistration !== false && event.type !== 'Booth',
    isUnlisted: !!event.isUnlisted,
    registrationMode: event.registrationMode || 'Auto',
    location: event.location || '',
    locationEn: event.locationEn || '',
    gains: event.gains || [],
    gainsEn: event.gainsEn || [],
    speakers: event.speakers || [],
    feedbackQuestions: event.feedbackQuestions || [],
  });
}

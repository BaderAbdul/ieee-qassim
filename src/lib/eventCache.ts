import { PlatformEvent } from './types';

// In-memory client-side event cache to eliminate loading skeleton when navigating between pages
const globalEventCache = new Map<string, PlatformEvent>();

export const eventCache = {
  get(id: string): PlatformEvent | undefined {
    return globalEventCache.get(id);
  },
  set(id: string, event: PlatformEvent): void {
    globalEventCache.set(id, event);
  },
  has(id: string): boolean {
    return globalEventCache.has(id);
  },
  populate(events: PlatformEvent[]): void {
    for (const ev of events) {
      if (ev && ev.id) {
        globalEventCache.set(ev.id, ev);
      }
    }
  }
};

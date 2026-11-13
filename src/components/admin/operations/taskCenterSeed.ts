import type { TCIdea } from '@/lib/taskCenter';

/** Small, clearly-placeholder starting data so the Ideas tab isn't empty on first load --
 * generic content, not anyone's real name or real idea. Goals/Projects/Tasks are now backed by
 * the real Task Center API (lib/taskCenterApi.ts) and no longer need seed data. */
export const SEED_IDEAS: TCIdea[] = [
  { id: 'idea-1', title: 'جلسات أسبوعية قصيرة بين الأقسام', description: 'مثال لفكرة قابلة للتصويت والمناقشة.',
    category: 'Community', status: 'new', votes: 0, createdBy: 'نظام', createdAt: new Date().toISOString() },
];

import type { TCGoal, TCIdea, TCProject, TCTask } from '@/lib/taskCenter';

/** Small, clearly-placeholder starting data so the new tabs aren't empty on first load --
 * generic content, not anyone's real name or real task, consistent with "design and logic
 * only, no real data" for this phase. */
export const SEED_PROJECTS: TCProject[] = [
  { id: 'proj-1', title: 'فعالية تعريفية جديدة', description: 'مثال لمشروع يضم عدة مهام موزعة على أكثر من قسم.',
    department: 'الفعاليات والبرامج', category: 'فعالية', status: 'active', progress: 35, dueDate: '', goalId: null,
    createdBy: 'نظام', createdAt: new Date().toISOString() },
];

export const SEED_TASKS: TCTask[] = [
  { id: 'task-1', title: 'تصميم بوستر الفعالية', description: 'مثال لمهمة ضمن قسم الإعلام والتصميم.', status: 'todo',
    priority: 'medium', dueDate: '', department: 'الإعلام والتصميم', projectId: 'proj-1', createdBy: 'نظام', createdAt: new Date().toISOString() },
  { id: 'task-2', title: 'تجهيز نموذج التسجيل', description: '', status: 'doing', priority: 'low', dueDate: '',
    department: 'التقنية', projectId: 'proj-1', createdBy: 'نظام', createdAt: new Date().toISOString() },
];

export const SEED_GOALS: TCGoal[] = [
  { id: 'goal-1', title: 'تأسيس نظام عمل تشغيلي مرن يضمن استدامة الفرع.',
    rationale: 'لضمان عمل الفريق بوضوح، وحفظ قرارات ومعرفة الفرع للأجيال القادمة.', order: 1 },
];

export const SEED_IDEAS: TCIdea[] = [
  { id: 'idea-1', title: 'جلسات أسبوعية قصيرة بين الأقسام', description: 'مثال لفكرة قابلة للتصويت والمناقشة.',
    category: 'Community', status: 'new', votes: 0, createdBy: 'نظام', createdAt: new Date().toISOString() },
];

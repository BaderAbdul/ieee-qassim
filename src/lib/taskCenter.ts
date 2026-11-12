/** مركز المهام (Task Center): local-only design/logic layer modeled on the team's external
 * task tool. Everything here lives in the browser (localStorage) -- no backend wiring yet, by
 * design: this phase is UI/UX and interaction only. Swapping this for real API calls later only
 * touches this file and useTaskCenterCollection, not the tab components. */

export const TASK_CENTER_DEPARTMENTS = [
  'الإدارة التنظيمية', 'الإعلام والتصميم', 'الابحاث والتطوير',
  'التقنية', 'العلاقات والمجتمع', 'الفعاليات والبرامج', 'القيادة',
] as const;
export type TaskCenterDepartment = typeof TASK_CENTER_DEPARTMENTS[number];

export const TASK_STATUSES = ['todo', 'doing', 'done', 'blocked'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, { ar: string; en: string }> = {
  todo: { ar: 'قيد الانتظار', en: 'To Do' },
  doing: { ar: 'قيد التنفيذ', en: 'Doing' },
  done: { ar: 'مكتملة', en: 'Done' },
  blocked: { ar: 'معلّقة', en: 'Blocked' },
};

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, { ar: string; en: string }> = {
  low: { ar: 'منخفضة', en: 'Low' },
  medium: { ar: 'متوسطة', en: 'Medium' },
  high: { ar: 'عالية', en: 'High' },
};

export const PROJECT_STATUSES = ['active', 'needs_follow_up', 'done'] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  needs_follow_up: { ar: 'تحتاج متابعة', en: 'Needs follow-up' },
  done: { ar: 'مكتمل', en: 'Done' },
};

export const IDEA_STATUSES = ['new', 'review', 'accepted', 'rejected'] as const;
export type IdeaStatus = typeof IDEA_STATUSES[number];
export const IDEA_STATUS_LABELS: Record<IdeaStatus, { ar: string; en: string }> = {
  new: { ar: 'جديدة', en: 'New' },
  review: { ar: 'قيد المراجعة', en: 'Under review' },
  accepted: { ar: 'مقبولة', en: 'Accepted' },
  rejected: { ar: 'مرفوضة', en: 'Rejected' },
};

export const IDEA_CATEGORIES = ['Events', 'Technical', 'Community', 'Other'] as const;

export interface TCProject {
  id: string;
  title: string;
  description: string;
  department: TaskCenterDepartment;
  category: string;
  status: ProjectStatus;
  progress: number; // 0-100
  dueDate: string; // yyyy-mm-dd
  goalId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TCTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  department: TaskCenterDepartment;
  projectId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TCGoal {
  id: string;
  title: string;
  rationale: string;
  order: number;
}

export interface TCIdea {
  id: string;
  title: string;
  description: string;
  category: typeof IDEA_CATEGORIES[number];
  status: IdeaStatus;
  votes: number;
  createdBy: string;
  createdAt: string;
}

export interface TCCheckin {
  id: string;
  author: string;
  accomplished: string;
  next: string;
  blockers: string;
  needs: string;
  createdAt: string;
}

export const RESOURCE_SECTIONS: { id: string; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }[] = [
  { id: 'goal', titleAr: 'أهداف الدليل', titleEn: 'Guide goals',
    bodyAr: 'أن يعرف كل قائد ونائب قائد: ماذا يملك، ماذا ينفذ، ماذا يتابع، ومتى يحتاج أن يرفع الموضوع للإدارة.',
    bodyEn: 'Every lead and deputy lead should know: what they own, what they execute, what they follow up on, and when to escalate to management.' },
  { id: 'team', titleAr: 'أولاً: فريق العمل', titleEn: 'I. The team',
    bodyAr: 'تعريف أعضاء الفريق وأدوارهم ونطاق مسؤولية كل قسم.', bodyEn: 'Team members, their roles, and each department’s scope of responsibility.' },
  { id: 'structure', titleAr: 'ثانياً: الهيكل القيادي', titleEn: 'II. Leadership structure',
    bodyAr: 'التسلسل القيادي من رئيس الفرع إلى قادة الأقسام ونوابهم.', bodyEn: 'The reporting chain from the branch chair down to department leads and deputies.' },
  { id: 'departments', titleAr: 'ثالثاً: الأقسام', titleEn: 'III. Departments',
    bodyAr: 'الأقسام السبعة ومسؤولية كل منها ضمن الفرع.', bodyEn: 'The seven departments and what each one owns within the branch.' },
  { id: 'delegation', titleAr: 'رابعاً: تفويض المهام', titleEn: 'IV. Delegating tasks',
    bodyAr: 'كيف تُسند المهمة، من يملك حق المتابعة، ومتى تُعتبر منجزة.', bodyEn: 'How a task is assigned, who owns follow-up, and when it counts as done.' },
  { id: 'handoff', titleAr: 'خامساً: بروتوكول التسليمات', titleEn: 'V. Handoff protocol',
    bodyAr: 'آلية تسليم العمل بين الأقسام مع تحديد الموعد والمسؤول.', bodyEn: 'How work hands off between departments, with an owner and a date.' },
  { id: 'escalation', titleAr: 'سادساً: سلم التصعيد', titleEn: 'VI. Escalation ladder',
    bodyAr: 'متى وكيف يُرفع القرار للمستوى الأعلى عند التعثر.', bodyEn: 'When and how a stuck decision moves up a level.' },
  { id: 'management', titleAr: 'سابعاً: نظام الإدارة', titleEn: 'VII. Management system',
    bodyAr: 'أدوات المتابعة الدورية: الاجتماعات، التحديثات الأسبوعية، ولوحة المهام.', bodyEn: 'The recurring cadence: meetings, weekly check-ins, and the task board.' },
];

export const RESOURCE_DOCUMENTS = [
  { ar: 'نموذج المسح الأمني', en: 'Security screening form' },
  { ar: 'جميع قوالب الشهادات', en: 'All certificate templates' },
  { ar: 'نموذج الاستضافة (داخلي/خارجي)', en: 'Hosting form (internal/external)' },
  { ar: 'فورم تفاصيل التصاميم المطلوبة من قسم الفعاليات', en: 'Design-request details form (from Events)' },
];

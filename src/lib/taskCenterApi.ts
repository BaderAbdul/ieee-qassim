/** Task Center (مركز المهام): real backend-persisted goals/projects/tasks, replacing the earlier
 * local-storage-only placeholder for these three resources. Checkin/Ideas/Resources/System stay
 * local-only for now -- see lib/taskCenter.ts. */

import { apiGet, apiSend } from '@/lib/backend';

export const PROJECT_CATEGORIES = ['lecture', 'workshop', 'event', 'initiative', 'other'] as const;
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];
export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, { ar: string; en: string }> = {
  lecture: { ar: 'محاضرة', en: 'Lecture' },
  workshop: { ar: 'ورشة عمل', en: 'Workshop' },
  event: { ar: 'فعالية', en: 'Event' },
  initiative: { ar: 'مبادرة', en: 'Initiative' },
  other: { ar: 'أخرى', en: 'Other' },
};

export const PROJECT_STATUSES = ['active', 'needs_follow_up', 'done'] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { ar: string; en: string }> = {
  active: { ar: 'نشط', en: 'Active' },
  needs_follow_up: { ar: 'تحتاج متابعة', en: 'Needs follow-up' },
  done: { ar: 'مكتمل', en: 'Done' },
};

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, { ar: string; en: string }> = {
  low: { ar: 'منخفضة', en: 'Low' },
  medium: { ar: 'متوسطة', en: 'Medium' },
  high: { ar: 'عالية', en: 'High' },
};

export const TASK_STATUSES = ['todo', 'doing', 'done', 'blocked'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, { ar: string; en: string }> = {
  todo: { ar: 'قيد الانتظار', en: 'To Do' },
  doing: { ar: 'قيد التنفيذ', en: 'Doing' },
  done: { ar: 'مكتملة', en: 'Done' },
  blocked: { ar: 'معلّقة', en: 'Blocked' },
};

export const DELIVERABLE_STATUSES = ['pending', 'in_progress', 'in_review', 'done'] as const;
export type DeliverableStatus = typeof DELIVERABLE_STATUSES[number];
export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  in_review: { ar: 'قيد المراجعة', en: 'In review' },
  done: { ar: 'مكتملة', en: 'Done' },
};

export const REQUEST_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type RequestStatus = typeof REQUEST_STATUSES[number];
export const REQUEST_STATUS_LABELS: Record<RequestStatus, { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  done: { ar: 'مكتملة', en: 'Done' },
};

export interface TeamRef { id: string; nameAr: string; nameEn: string }
export interface PersonRef { id: string; name: string }

export interface Goal {
  id: number;
  title: string;
  why: string;
  successMetric: string;
  teamId: string | null;
  teamNameAr?: string | null;
  teamNameEn?: string | null;
  progress: number;
  position: number;
  createdBy: string | null;
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  category: ProjectCategory;
  objective: string;
  goalIds: number[];
  ownerIds: string[];
  teamIds: string[];
  teams: TeamRef[];
  owners: PersonRef[];
  deadline: string | null;
  status: ProjectStatus;
  autoCreated: boolean;
  tasksTotal: number;
  tasksDone: number;
  createdBy: string | null;
  createdAt: string;
}

export function projectProgress(project: Pick<Project, 'tasksTotal' | 'tasksDone'>): number {
  return project.tasksTotal > 0 ? Math.round((100 * project.tasksDone) / project.tasksTotal) : 0;
}

export interface TCTask {
  id: number;
  title: string;
  description: string;
  projectId: number | null;
  projectName?: string | null;
  assigneeIds: string[];
  assignees: PersonRef[];
  teamIds: string[];
  teams: TeamRef[];
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string | null;
  createdAt: string;
}

export interface Deliverable {
  id: number;
  projectId: number;
  teamId: string | null;
  teamNameAr?: string | null;
  teamNameEn?: string | null;
  title: string;
  dueDate: string | null;
  status: DeliverableStatus;
  rating: number | null;
  fileUrl: string | null;
  notes: string;
  createdBy: string | null;
  createdAt: string;
}

export interface CrossTeamRequest {
  id: number;
  projectId: number;
  what: string;
  fromTeamId: string;
  toTeamId: string;
  fromTeamNameAr: string;
  fromTeamNameEn: string;
  toTeamNameAr: string;
  toTeamNameEn: string;
  dueDate: string | null;
  status: RequestStatus;
  createdBy: string | null;
  createdAt: string;
}

export interface TeamLeaderboardMember { userId: string; name: string; role: string; totalPoints: number }
export interface TeamLeaderboardEntry { id: string; nameAr: string; nameEn: string; members: TeamLeaderboardMember[] }
export interface RemainingTasksEntry { userId: string; name: string; remainingCount: number }

const BASE = '/api/admin/task-center';

export const goalsApi = {
  list: () => apiGet<{ goals: Goal[] }>(`${BASE}/goals`).then(r => r.goals),
  create: (data: { title: string; why: string; successMetric: string; teamId: string | null }) =>
    apiSend<{ status: string; id: number }>('POST', `${BASE}/goals`, data),
  update: (id: number, data: { title: string; why: string; successMetric: string; teamId: string | null; progress: number }) =>
    apiSend<{ status: string }>('PATCH', `${BASE}/goals/${id}`, data),
  remove: (id: number) => apiSend<{ status: string }>('DELETE', `${BASE}/goals/${id}`),
};

export interface ProjectInput {
  name: string; description: string; category: ProjectCategory; objective: string;
  goalIds: number[]; ownerIds: string[]; teamIds: string[]; deadline: string | null; status: ProjectStatus;
}

export const projectsApi = {
  list: (teamId?: string) => apiGet<{ projects: Project[] }>(`${BASE}/projects`, teamId ? { teamId } : undefined).then(r => r.projects),
  get: (id: number) => apiGet<Project>(`${BASE}/projects/${id}`),
  create: (data: ProjectInput) => apiSend<{ status: string; id: number }>('POST', `${BASE}/projects`, data),
  update: (id: number, data: ProjectInput) => apiSend<{ status: string }>('PATCH', `${BASE}/projects/${id}`, data),
  remove: (id: number) => apiSend<{ status: string }>('DELETE', `${BASE}/projects/${id}`),
};

export interface TaskInput {
  title: string; description: string; projectId: number | null; assigneeIds: string[]; teamIds: string[];
  deadline: string | null; priority: TaskPriority; status: TaskStatus;
}

export const tasksApi = {
  list: (params?: { mine?: boolean; assigneeId?: string; teamId?: string; projectId?: number }) =>
    apiGet<{ tasks: TCTask[] }>(`${BASE}/tasks`, {
      ...(params?.mine ? { mine: 'true' } : {}),
      ...(params?.assigneeId ? { assigneeId: params.assigneeId } : {}),
      ...(params?.teamId ? { teamId: params.teamId } : {}),
      ...(params?.projectId ? { projectId: String(params.projectId) } : {}),
    }).then(r => r.tasks),
  create: (data: TaskInput) => apiSend<{ status: string; id: number }>('POST', `${BASE}/tasks`, data),
  update: (id: number, data: TaskInput) => apiSend<{ status: string }>('PATCH', `${BASE}/tasks/${id}`, data),
  setStatus: (id: number, status: TaskStatus) => apiSend<{ status: string }>('PATCH', `${BASE}/tasks/${id}/status`, { status }),
  remove: (id: number) => apiSend<{ status: string }>('DELETE', `${BASE}/tasks/${id}`),
};

export const deliverablesApi = {
  list: (projectId: number) => apiGet<{ deliverables: Deliverable[] }>(`${BASE}/projects/${projectId}/deliverables`).then(r => r.deliverables),
  create: (projectId: number, data: Partial<Deliverable>) =>
    apiSend<{ status: string; id: number }>('POST', `${BASE}/projects/${projectId}/deliverables`, data),
  update: (id: number, data: Partial<Deliverable>) => apiSend<{ status: string }>('PATCH', `${BASE}/deliverables/${id}`, data),
  remove: (id: number) => apiSend<{ status: string }>('DELETE', `${BASE}/deliverables/${id}`),
};

export const crossTeamRequestsApi = {
  listForProject: (projectId: number) =>
    apiGet<{ requests: CrossTeamRequest[] }>(`${BASE}/projects/${projectId}/cross-team-requests`).then(r => r.requests),
  listAll: () => apiGet<{ requests: CrossTeamRequest[] }>(`${BASE}/cross-team-requests`).then(r => r.requests),
  create: (projectId: number, data: { what: string; fromTeamId: string; toTeamId: string; dueDate: string | null; status: RequestStatus }) =>
    apiSend<{ status: string; id: number }>('POST', `${BASE}/projects/${projectId}/cross-team-requests`, data),
  update: (id: number, data: { what: string; fromTeamId: string; toTeamId: string; dueDate: string | null; status: RequestStatus }) =>
    apiSend<{ status: string }>('PATCH', `${BASE}/cross-team-requests/${id}`, data),
  remove: (id: number) => apiSend<{ status: string }>('DELETE', `${BASE}/cross-team-requests/${id}`),
};

export const overviewApi = {
  leaderboard: () => apiGet<{ teams: TeamLeaderboardEntry[] }>(`${BASE}/overview/leaderboard`).then(r => r.teams),
  remainingTasks: () => apiGet<{ users: RemainingTasksEntry[] }>(`${BASE}/overview/remaining-tasks`).then(r => r.users),
};

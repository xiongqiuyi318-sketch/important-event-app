export type EventPriority = 1 | 2 | 3 | 4;

export type EventCategory = 
  | '发货' 
  | '进口' 
  | '本地销售' 
  | '开会' 
  | '学习' 
  | '项目开发' 
  | '活动策划' 
  | '机械维修' 
  | '其他';

export interface EventStep {
  id: string;
  content: string;
  completed: boolean;
  order: number;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  priority: EventPriority;
  deadline?: string; // ISO date string (optional)
  startTime?: string; // ISO date string (optional)
  steps: EventStep[];
  createdAt: string; // ISO date string
  completed: boolean;
  expired: boolean;
  sortOrder: number; // 用于手动排序
}

export interface EventsState {
  events: Event[];
  version?: number; // 数据版本号，用于数据迁移
}

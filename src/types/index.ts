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

export interface StepStatusImage {
  dataUrl?: string; // legacy inline data for backward compatibility
  url?: string; // accessible http(s) url
  storageBucket?: string; // supabase storage bucket
  storagePath?: string; // object path in bucket
  name?: string;
  type?: string;
  size?: number; // bytes
  addedAt: string; // ISO date string
}

/** 步骤附件（Excel / PDF 等），支持 dataUrl(兼容) 或 Storage 引用 */
export interface StepAttachment {
  dataUrl?: string;
  url?: string;
  storageBucket?: string;
  storagePath?: string;
  name?: string;
  type?: string;
  size?: number;
  addedAt: string;
}

export interface EventStep {
  id: string;
  content: string;
  completed: boolean;
  order: number;
  status?: string; // 步骤完成情况的描述
  statusImages?: StepStatusImage[]; // 步骤状态图片（最多 3 张）
  statusImage?: StepStatusImage; // 兼容旧数据（单图）
  excelDocuments?: StepAttachment[]; // Excel（最多 3 个）
  pdfDocuments?: StepAttachment[]; // PDF（最多 3 个）
  scheduledTime?: string; // ISO date string (optional) - 步骤计划时间
  reminderEnabled?: boolean; // 是否启用提醒
  reminderType?: 'sound' | 'vibration' | 'both'; // 提醒类型：铃声、振动或两者
}

export interface Event {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  category: EventCategory;
  priority: EventPriority;
  deadline?: string; // ISO date string (optional)
  startTime?: string; // ISO date string (optional)
  steps: EventStep[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string，最近更新时间
  updatedByDevice?: string; // 最近更新所使用的设备
  completed: boolean;
  expired: boolean;
  sortOrder: number; // 用于手动排序
  startTimeReminderEnabled?: boolean; // 开始时间是否启用提醒
  startTimeReminderType?: 'sound' | 'vibration' | 'both'; // 开始时间提醒类型
  deadlineReminderEnabled?: boolean; // 结束时间是否启用提醒
  deadlineReminderType?: 'sound' | 'vibration' | 'both'; // 结束时间提醒类型
}

export interface EventsState {
  events: Event[];
  version?: number; // 数据版本号，用于数据迁移
}

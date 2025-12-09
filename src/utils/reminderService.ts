import { Event, EventStep } from '../types';

export interface ReminderItem {
  id: string;
  type: 'step' | 'startTime' | 'deadline';
  eventId: string;
  eventTitle: string;
  stepId?: string;
  stepContent?: string;
  scheduledTime: string;
  isOverdue: boolean;
  overdueMinutes?: number;
}

// 检查提醒时间
export const checkReminders = (events: Event[]): ReminderItem[] => {
  const reminders: ReminderItem[] = [];
  const now = new Date();
  const nowTime = now.getTime();

  events.forEach(event => {
    // 只检查未完成的事件（即使事件已过期，如果提醒时间到了也应该提醒）
    if (event.completed) return;

    // 检查步骤提醒
    event.steps.forEach(step => {
      if (step.reminderEnabled && step.scheduledTime && !step.completed) {
        const stepTime = new Date(step.scheduledTime).getTime();
        const diffMinutes = Math.floor((nowTime - stepTime) / (1000 * 60));
        
        // 如果时间已到（允许1分钟误差）或已过期
        if (diffMinutes >= 0) {
          reminders.push({
            id: `step-${step.id}`,
            type: 'step',
            eventId: event.id,
            eventTitle: event.title,
            stepId: step.id,
            stepContent: step.content,
            scheduledTime: step.scheduledTime,
            isOverdue: diffMinutes > 0,
            overdueMinutes: diffMinutes > 0 ? diffMinutes : undefined,
          });
        }
      }
    });

    // 检查开始时间提醒
    if (event.startTimeReminderEnabled && event.startTime) {
      const startTime = new Date(event.startTime).getTime();
      const diffMinutes = Math.floor((nowTime - startTime) / (1000 * 60));
      
      if (diffMinutes >= 0) {
        reminders.push({
          id: `start-${event.id}`,
          type: 'startTime',
          eventId: event.id,
          eventTitle: event.title,
          scheduledTime: event.startTime,
          isOverdue: diffMinutes > 0,
          overdueMinutes: diffMinutes > 0 ? diffMinutes : undefined,
        });
      }
    }

    // 检查截止时间提醒
    if (event.deadlineReminderEnabled && event.deadline) {
      const deadlineTime = new Date(event.deadline).getTime();
      const diffMinutes = Math.floor((nowTime - deadlineTime) / (1000 * 60));
      
      if (diffMinutes >= 0) {
        reminders.push({
          id: `deadline-${event.id}`,
          type: 'deadline',
          eventId: event.id,
          eventTitle: event.title,
          scheduledTime: event.deadline,
          isOverdue: diffMinutes > 0,
          overdueMinutes: diffMinutes > 0 ? diffMinutes : undefined,
        });
      }
    }
  });

  return reminders;
};

// 格式化过期时间
export const formatOverdueTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
  }
};


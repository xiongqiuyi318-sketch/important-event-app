import { Event, EventStep } from '../types';
import { format } from 'date-fns';

/**
 * 生成 ICS 文件内容
 */
export function generateICS(events: Event[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//重要事件备忘录//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:重要事件备忘录',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ];

  events.forEach(event => {
    // 为事件的开始时间创建日历条目
    if (event.startTime && event.startTimeReminderEnabled) {
      lines.push(...createEventEntry(
        event.id + '-start',
        event.title + ' - 开始',
        event.description || '',
        event.startTime,
        event.category
      ));
    }

    // 为事件的截止时间创建日历条目
    if (event.deadline && event.deadlineReminderEnabled) {
      lines.push(...createEventEntry(
        event.id + '-deadline',
        event.title + ' - 截止',
        event.description || '',
        event.deadline,
        event.category
      ));
    }

    // 为每个步骤创建日历条目
    event.steps.forEach((step, index) => {
      if (step.scheduledTime && step.reminderEnabled) {
        lines.push(...createEventEntry(
          event.id + '-step-' + step.id,
          `${event.title} - 步骤${index + 1}`,
          step.content,
          step.scheduledTime,
          event.category,
          event.title
        ));
      }
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * 创建单个日历事件条目
 */
function createEventEntry(
  uid: string,
  title: string,
  description: string,
  dateTime: string,
  category: string,
  parentTitle?: string
): string[] {
  const date = new Date(dateTime);
  const dtstart = formatICSDate(date);
  const dtend = formatICSDate(new Date(date.getTime() + 30 * 60000)); // 默认30分钟
  const dtstamp = formatICSDate(new Date());

  const fullDescription = parentTitle 
    ? `事件：${parentTitle}\n${description}\n分类：${category}`
    : `${description}\n分类：${category}`;

  return [
    'BEGIN:VEVENT',
    `UID:${uid}@important-events-memo`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICSText(title)}`,
    `DESCRIPTION:${escapeICSText(fullDescription)}`,
    `CATEGORIES:${escapeICSText(category)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    // 提前15分钟提醒
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(title)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

/**
 * 格式化日期为ICS格式：20231210T143000Z
 */
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * 转义ICS文本中的特殊字符
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 下载ICS文件
 */
export function downloadICS(events: Event[], filename?: string) {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `重要事件备忘录_${format(new Date(), 'yyyyMMdd')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 为单个事件生成ICS
 */
export function generateSingleEventICS(event: Event): string {
  return generateICS([event]);
}

/**
 * 下载单个事件的ICS
 */
export function downloadSingleEventICS(event: Event) {
  const icsContent = generateSingleEventICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title}_${format(new Date(), 'yyyyMMdd')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成 Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: Event): string {
  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.category);
  
  let dates = '';
  if (event.startTime && event.deadline) {
    const start = formatGoogleDate(event.startTime);
    const end = formatGoogleDate(event.deadline);
    dates = `${start}/${end}`;
  } else if (event.startTime) {
    const start = formatGoogleDate(event.startTime);
    const end = formatGoogleDate(new Date(new Date(event.startTime).getTime() + 3600000).toISOString());
    dates = `${start}/${end}`;
  } else if (event.deadline) {
    const end = formatGoogleDate(event.deadline);
    const start = formatGoogleDate(new Date(new Date(event.deadline).getTime() - 3600000).toISOString());
    dates = `${start}/${end}`;
  }
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}`;
}

/**
 * 生成 Outlook Calendar URL
 */
export function generateOutlookCalendarUrl(event: Event): string {
  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.category);
  
  const startTime = event.startTime 
    ? new Date(event.startTime).toISOString()
    : '';
  const endTime = event.deadline 
    ? new Date(event.deadline).toISOString()
    : (event.startTime ? new Date(new Date(event.startTime).getTime() + 3600000).toISOString() : '');
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&location=${location}&startdt=${startTime}&enddt=${endTime}`;
}

/**
 * 格式化日期为Google Calendar格式
 */
function formatGoogleDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * 检测是否为移动设备
 */
export function isMobile(): boolean {
  return /iPhone|iPad|Android/i.test(navigator.userAgent);
}

/**
 * 智能添加到日历（自动选择最佳方式）
 */
export async function addToCalendarSmart(event: Event): Promise<{ success: boolean; method: string }> {
  // 移动端：尝试使用系统分享
  if (isMobile() && navigator.share) {
    try {
      const icsContent = generateSingleEventICS(event);
      const file = new File([icsContent], `${event.title}.ics`, {
        type: 'text/calendar',
      });
      
      await navigator.share({
        title: event.title,
        text: `添加事件到日历：${event.title}`,
        files: [file],
      });
      
      return { success: true, method: 'share' };
    } catch (err) {
      console.log('Share API 不可用或用户取消', err);
      // 回退到下载方式
    }
  }
  
  // 桌面端或移动端分享失败：下载 ICS 文件
  downloadSingleEventICS(event);
  return { success: true, method: 'download' };
}


import { useState, useEffect, useCallback } from 'react';
import { loadEvents } from '../utils/storage';
import { checkReminders, ReminderItem, formatOverdueTime } from '../utils/reminderService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function ReminderManager() {
  const [shownReminderIds, setShownReminderIds] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // 检查通知权限状态
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const showReminderNotification = (reminder: ReminderItem) => {
    const timeStr = format(new Date(reminder.scheduledTime), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    let title = '';
    let body = '';
    let requireInteraction = false;

    if (reminder.type === 'step') {
      title = reminder.isOverdue ? '⚠️ 步骤提醒（已过期）' : '⏰ 步骤提醒';
      body = `事件：${reminder.eventTitle}\n步骤：${reminder.stepContent}\n计划时间：${timeStr}`;
      if (reminder.isOverdue && reminder.overdueMinutes) {
        body += `\n已过期：${formatOverdueTime(reminder.overdueMinutes)}`;
        requireInteraction = true;
      }
    } else if (reminder.type === 'startTime') {
      title = reminder.isOverdue ? '⚠️ 开始时间提醒（已过期）' : '⏰ 开始时间提醒';
      body = `事件：${reminder.eventTitle}\n开始时间：${timeStr}`;
      if (reminder.isOverdue && reminder.overdueMinutes) {
        body += `\n已过期：${formatOverdueTime(reminder.overdueMinutes)}`;
        requireInteraction = true;
      }
    } else if (reminder.type === 'deadline') {
      title = reminder.isOverdue ? '⚠️ 截止时间提醒（已过期）' : '⏰ 截止时间提醒';
      body = `事件：${reminder.eventTitle}\n截止时间：${timeStr}`;
      if (reminder.isOverdue && reminder.overdueMinutes) {
        body += `\n已过期：${formatOverdueTime(reminder.overdueMinutes)}`;
        requireInteraction = true;
      }
    }

    // 检查通知权限
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: requireInteraction, // 过期提醒需要用户主动关闭
        tag: reminder.id, // 防止重复通知
        vibrate: [200, 100, 200], // 振动模式
      });

      // 点击通知时聚焦到窗口
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自动关闭（非过期提醒30秒后关闭）
      if (!requireInteraction) {
        setTimeout(() => notification.close(), 30000);
      }
    } else {
      // 如果没有通知权限，退回到alert
      const message = `${title}\n\n${body}`;
      alert(message);
    }
  };

  const checkAndShowReminders = useCallback(() => {
    const events = loadEvents();
    const reminders = checkReminders(events);

    // 过滤出未显示过的提醒
    const newReminders = reminders.filter(
      reminder => !shownReminderIds.has(reminder.id)
    );

    if (newReminders.length > 0) {
      // 按时间排序，优先显示最早到期的提醒
      newReminders.sort((a, b) => {
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });

      // 显示第一个提醒
      const reminderToShow = newReminders[0];
      showReminderNotification(reminderToShow);
      setShownReminderIds(prev => new Set([...prev, reminderToShow.id]));
      
      // 如果还有更多提醒，延迟显示下一个
      if (newReminders.length > 1) {
        setTimeout(() => {
          checkAndShowReminders();
        }, 500);
      }
    }
  }, [shownReminderIds]);

  useEffect(() => {
    // 初始检查
    checkAndShowReminders();

    // 每30秒检查一次提醒（更频繁的检查，确保及时提醒）
    const interval = setInterval(() => {
      checkAndShowReminders();
    }, 30000); // 30秒

    // 当页面可见性改变时也检查（用户切换回标签页时）
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 切换回标签页时，重置已显示的提醒，允许重新检查
        setShownReminderIds(new Set());
        checkAndShowReminders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAndShowReminders]);

  // 当事件数据更新时，重置已显示的提醒ID（允许重新提醒）
  useEffect(() => {
    const handleStorageChange = () => {
      // 清空已显示的提醒，允许重新检查
      setShownReminderIds(new Set());
      // 延迟一点执行，确保数据已更新
      setTimeout(() => {
        checkAndShowReminders();
      }, 100);
    };

    // 监听 storage 事件（当其他标签页更新数据时）
    window.addEventListener('storage', handleStorageChange);

    // 自定义事件（当当前标签页更新数据时）
    window.addEventListener('eventsUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('eventsUpdated', handleStorageChange);
    };
  }, [checkAndShowReminders]);

  return null;
}


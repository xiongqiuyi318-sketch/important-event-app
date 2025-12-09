import { useState, useEffect, useCallback } from 'react';
import { loadEvents } from '../utils/storage';
import { checkReminders, ReminderItem } from '../utils/reminderService';
import ReminderModal from './ReminderModal';

const SHOWN_REMINDERS_KEY = 'shown_reminder_ids';
const LAST_CLEAR_DATE_KEY = 'last_reminder_clear_date';

export default function ReminderManager() {
  const [currentReminder, setCurrentReminder] = useState<ReminderItem | null>(null);
  const [pendingReminders, setPendingReminders] = useState<ReminderItem[]>([]);

  // 从localStorage加载已显示的提醒ID
  const loadShownReminderIds = useCallback((): Set<string> => {
    try {
      const today = new Date().toDateString();
      const lastClearDate = localStorage.getItem(LAST_CLEAR_DATE_KEY);
      
      // 如果是新的一天，清空已显示的提醒ID
      if (lastClearDate !== today) {
        localStorage.setItem(LAST_CLEAR_DATE_KEY, today);
        localStorage.removeItem(SHOWN_REMINDERS_KEY);
        return new Set();
      }

      const stored = localStorage.getItem(SHOWN_REMINDERS_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load shown reminder IDs:', error);
    }
    return new Set();
  }, []);

  // 保存已显示的提醒ID到localStorage
  const saveShownReminderId = useCallback((id: string) => {
    try {
      const shownIds = loadShownReminderIds();
      shownIds.add(id);
      localStorage.setItem(SHOWN_REMINDERS_KEY, JSON.stringify([...shownIds]));
    } catch (error) {
      console.error('Failed to save shown reminder ID:', error);
    }
  }, [loadShownReminderIds]);

  // 检查并显示提醒
  const checkAndShowReminders = useCallback(() => {
    const events = loadEvents();
    const reminders = checkReminders(events);
    const shownIds = loadShownReminderIds();

    // 过滤出未显示过的提醒
    const newReminders = reminders.filter(
      reminder => !shownIds.has(reminder.id)
    );

    if (newReminders.length > 0) {
      // 按时间排序，优先显示最早到期的提醒
      newReminders.sort((a, b) => {
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });

      // 如果当前没有显示提醒，显示第一个
      if (!currentReminder) {
        const reminderToShow = newReminders[0];
        setCurrentReminder(reminderToShow);
        saveShownReminderId(reminderToShow.id);
        
        // 将剩余的提醒放入待处理队列
        if (newReminders.length > 1) {
          setPendingReminders(newReminders.slice(1));
        }
      }
    }
  }, [currentReminder, loadShownReminderIds, saveShownReminderId]);

  // 关闭当前提醒，显示下一个
  const handleCloseReminder = useCallback(() => {
    setCurrentReminder(null);
    
    // 如果还有待显示的提醒，延迟显示下一个
    if (pendingReminders.length > 0) {
      setTimeout(() => {
        const nextReminder = pendingReminders[0];
        setCurrentReminder(nextReminder);
        saveShownReminderId(nextReminder.id);
        setPendingReminders(prev => prev.slice(1));
      }, 300);
    }
  }, [pendingReminders, saveShownReminderId]);

  useEffect(() => {
    // 延迟2秒后开始初始检查（避免页面刚加载就弹出大量提醒）
    const initialTimeout = setTimeout(() => {
      checkAndShowReminders();
    }, 2000);

    // 每60秒检查一次提醒
    const interval = setInterval(() => {
      checkAndShowReminders();
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkAndShowReminders]);

  return (
    <>
      {currentReminder && (
        <ReminderModal 
          reminder={currentReminder} 
          onClose={handleCloseReminder} 
        />
      )}
    </>
  );
}

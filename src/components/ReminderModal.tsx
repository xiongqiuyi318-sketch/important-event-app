import { ReminderItem, formatOverdueTime } from '../utils/reminderService';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './ReminderModal.css';

interface ReminderModalProps {
  reminder: ReminderItem;
  onClose: () => void;
}

export default function ReminderModal({ reminder, onClose }: ReminderModalProps) {
  const getReminderTitle = () => {
    if (reminder.isOverdue) {
      return '⏰ 提醒已超时';
    }
    return '⏰ 提醒';
  };

  const getReminderContent = () => {
    const timeStr = format(new Date(reminder.scheduledTime), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    
    if (reminder.type === 'step') {
      if (reminder.isOverdue && reminder.overdueMinutes) {
        return (
          <div>
            <p><strong>事件：</strong>{reminder.eventTitle}</p>
            <p><strong>步骤：</strong>{reminder.stepContent}</p>
            <p><strong>计划时间：</strong>{timeStr}</p>
            <p className="overdue-message">
              <strong>已超时：</strong>{formatOverdueTime(reminder.overdueMinutes)}
            </p>
          </div>
        );
      }
      return (
        <div>
          <p><strong>事件：</strong>{reminder.eventTitle}</p>
          <p><strong>步骤：</strong>{reminder.stepContent}</p>
          <p><strong>计划时间：</strong>{timeStr}</p>
          <p>该步骤的时间已到，请及时处理！</p>
        </div>
      );
    } else if (reminder.type === 'startTime') {
      if (reminder.isOverdue && reminder.overdueMinutes) {
        return (
          <div>
            <p><strong>事件：</strong>{reminder.eventTitle}</p>
            <p><strong>开始时间：</strong>{timeStr}</p>
            <p className="overdue-message">
              <strong>已超时：</strong>{formatOverdueTime(reminder.overdueMinutes)}
            </p>
          </div>
        );
      }
      return (
        <div>
          <p><strong>事件：</strong>{reminder.eventTitle}</p>
          <p><strong>开始时间：</strong>{timeStr}</p>
          <p>事件开始时间已到！</p>
        </div>
      );
    } else if (reminder.type === 'deadline') {
      if (reminder.isOverdue && reminder.overdueMinutes) {
        return (
          <div>
            <p><strong>事件：</strong>{reminder.eventTitle}</p>
            <p><strong>截止时间：</strong>{timeStr}</p>
            <p className="overdue-message">
              <strong>已超时：</strong>{formatOverdueTime(reminder.overdueMinutes)}
            </p>
          </div>
        );
      }
      return (
        <div>
          <p><strong>事件：</strong>{reminder.eventTitle}</p>
          <p><strong>截止时间：</strong>{timeStr}</p>
          <p>事件截止时间已到，请尽快完成！</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="reminder-modal-overlay" onClick={onClose}>
      <div className="reminder-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`reminder-modal-header ${reminder.isOverdue ? 'overdue' : ''}`}>
          <h2>{getReminderTitle()}</h2>
        </div>
        <div className="reminder-modal-content">
          {getReminderContent()}
        </div>
        <div className="reminder-modal-actions">
          <button className="btn-reminder-ok" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}










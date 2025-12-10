import { useState } from 'react';
import { Event } from '../types';
import { 
  addToCalendarSmart, 
  downloadSingleEventICS,
  downloadICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  isMobile
} from '../utils/calendarSync';
import { loadEvents } from '../utils/storage';
import './CalendarSyncButton.css';

interface CalendarSyncButtonProps {
  event?: Event;
  variant?: 'all' | 'single';
}

export default function CalendarSyncButton({ 
  event, 
  variant = 'all' 
}: CalendarSyncButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const handleQuickAdd = async () => {
    if (variant === 'single' && event) {
      // 单个事件：显示选项弹窗（3个选项）
      setShowOptions(true);
    } else {
      // 批量导出：直接下载ICS文件
      const events = loadEvents();
      const activeEvents = events.filter(e => !e.completed && !e.expired);
      const eventsWithReminders = activeEvents.filter(e => 
        (e.startTime && e.startTimeReminderEnabled) || 
        (e.deadline && e.deadlineReminderEnabled) ||
        e.steps.some(s => s.scheduledTime && s.reminderEnabled)
      );
      
      if (eventsWithReminders.length === 0) {
        alert('当前没有设置了提醒的事件。\n\n请先为事件设置开始时间或截止时间，并启用提醒。');
        return;
      }
      
      // 直接下载
      downloadICS(eventsWithReminders);
      
      // 显示导入说明
      setShowInstructions(true);
    }
  };
  
  return (
    <>
      <button 
        className="btn-calendar-sync"
        onClick={handleQuickAdd}
        title={variant === 'single' ? '添加到日历' : '导出全部到日历'}
      >
        📅 {variant === 'single' ? '添加到日历' : '导出到日历'}
      </button>
      
      {/* 选项弹窗 */}
      {showOptions && (
        <CalendarOptionsModal 
          event={event}
          onClose={() => setShowOptions(false)} 
        />
      )}
      
      {/* 导入说明弹窗 */}
      {showInstructions && (
        <InstructionsModal 
          onClose={() => setShowInstructions(false)}
        />
      )}
    </>
  );
}

// 日历选项弹窗
function CalendarOptionsModal({ 
  event, 
  onClose 
}: { 
  event?: Event; 
  onClose: () => void;
}) {
  const handleGoogleCalendar = () => {
    if (event) {
      const url = generateGoogleCalendarUrl(event);
      window.open(url, '_blank');
    } else {
      // 批量导出暂不支持在线日历，提示用户
      alert('批量导出暂不支持在线日历，请使用"下载文件"方式。');
    }
    onClose();
  };
  
  const handleOutlook = () => {
    if (event) {
      const url = generateOutlookCalendarUrl(event);
      window.open(url, '_blank');
    } else {
      alert('批量导出暂不支持在线日历，请使用"下载文件"方式。');
    }
    onClose();
  };
  
  const handleDownload = () => {
    if (event) {
      downloadSingleEventICS(event);
    } else {
      const events = loadEvents();
      const activeEvents = events.filter(e => !e.completed && !e.expired);
      const eventsWithReminders = activeEvents.filter(e => 
        (e.startTime && e.startTimeReminderEnabled) || 
        (e.deadline && e.deadlineReminderEnabled) ||
        e.steps.some(s => s.scheduledTime && s.reminderEnabled)
      );
      
      if (eventsWithReminders.length === 0) {
        alert('当前没有设置了提醒的事件。\n请先为事件设置时间并启用提醒。');
        onClose();
        return;
      }
      
      downloadICS(eventsWithReminders);
    }
    onClose();
    
    // 显示说明
    setTimeout(() => {
      alert(getInstructionsText());
    }, 500);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="calendar-options-modal" onClick={e => e.stopPropagation()}>
        <div className="calendar-options-header">
          <h3>📅 选择日历应用</h3>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>
        
        <div className="calendar-options-content">
          <p className="options-hint">
            {event ? '将此事件添加到：' : '导出全部事件到：'}
          </p>
          
          <div className="calendar-options-list">
            <button 
              className="calendar-option"
              onClick={handleGoogleCalendar}
            >
              <span className="option-icon">📧</span>
              <div className="option-info">
                <span className="option-name">Google 日历</span>
                <span className="option-desc">在线添加，跨设备同步</span>
              </div>
              <span className="option-arrow">→</span>
            </button>
            
            <button 
              className="calendar-option"
              onClick={handleOutlook}
            >
              <span className="option-icon">📨</span>
              <div className="option-info">
                <span className="option-name">Outlook 日历</span>
                <span className="option-desc">适用于 Outlook 用户</span>
              </div>
              <span className="option-arrow">→</span>
            </button>
            
            <button 
              className="calendar-option"
              onClick={handleDownload}
            >
              <span className="option-icon">📥</span>
              <div className="option-info">
                <span className="option-name">下载文件</span>
                <span className="option-desc">导入到任意日历应用</span>
              </div>
              <span className="option-arrow">→</span>
            </button>
          </div>
          
          <div className="calendar-options-note">
            <p>💡 <strong>提示：</strong></p>
            <ul>
              <li>选择 Google/Outlook 可直接在线添加</li>
              <li>下载文件适用于所有日历应用（推荐）</li>
              <li>手机用户建议下载后用日历应用打开</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 导入说明弹窗
function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="instructions-modal" onClick={e => e.stopPropagation()}>
        <div className="instructions-header">
          <h3>📥 如何导入到日历</h3>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>
        
        <div className="instructions-content">
          <div className="instruction-section">
            <h4>📱 手机端：</h4>
            <ol>
              <li>找到下载的 <code>.ics</code> 文件</li>
              <li>点击文件</li>
              <li>选择"添加到日历"或"导入"</li>
              <li>确认导入</li>
            </ol>
          </div>
          
          <div className="instruction-section">
            <h4>💻 电脑端：</h4>
            <ol>
              <li>双击下载的 <code>.ics</code> 文件</li>
              <li>系统会自动打开默认日历应用</li>
              <li>确认导入</li>
            </ol>
          </div>
          
          <div className="instruction-section">
            <h4>🔔 提醒设置：</h4>
            <ul>
              <li>事件会在计划时间<strong>提前15分钟</strong>提醒</li>
              <li>即使关闭浏览器，日历也会提醒您</li>
              <li>可以在日历应用中修改提醒时间</li>
            </ul>
          </div>
          
          <div className="instructions-success">
            <p>✅ 导入成功后，您将在系统日历中收到提醒！</p>
          </div>
        </div>
        
        <div className="instructions-actions">
          <button className="btn-got-it" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}

// 获取导入说明文本
function getInstructionsText(): string {
  const mobile = isMobile();
  
  if (mobile) {
    return `📥 文件已下载！

📱 手机导入步骤：
1. 找到下载的 .ics 文件
2. 点击文件
3. 选择"添加到日历"
4. 确认导入

✅ 完成后，您将在日历中收到提醒！
即使关闭浏览器也会提醒。`;
  } else {
    return `📥 文件已下载！

💻 电脑导入步骤：
1. 双击下载的 .ics 文件
2. 系统会自动打开日历应用
3. 确认导入

✅ 完成后，您将在日历中收到提醒！
即使关闭浏览器也会提醒。`;
  }
}


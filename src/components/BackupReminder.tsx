import { useState, useEffect } from 'react';
import { shouldShowBackupReminder, recordBackup, exportToFile } from '../utils/dataSync';
import { loadEvents } from '../utils/storage';
import './BackupReminder.css';

export default function BackupReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    // 检查是否需要显示备份提醒
    const events = loadEvents();
    setEventCount(events.length);
    
    if (shouldShowBackupReminder() && events.length > 0) {
      // 延迟显示，避免和通知提示冲突
      setTimeout(() => {
        setShowReminder(true);
      }, 2000);
    }

    // 监听存储警告
    const handleStorageWarning = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { size, max } = customEvent.detail;
      console.warn('Storage warning:', size, '/', max);
      setStorageWarning(true);
    };

    window.addEventListener('storageWarning', handleStorageWarning);
    
    return () => {
      window.removeEventListener('storageWarning', handleStorageWarning);
    };
  }, []);

  const handleBackupNow = () => {
    exportToFile();
    recordBackup();
    setShowReminder(false);
    setStorageWarning(false);
  };

  const handleRemindLater = () => {
    setShowReminder(false);
    // 3天后再提醒
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 3);
    localStorage.setItem('lastBackupDate', remindDate.toISOString());
  };

  const handleDismiss = () => {
    setShowReminder(false);
    recordBackup(); // 记录为已备份，7天后再提醒
  };

  if (!showReminder && !storageWarning) {
    return null;
  }

  return (
    <>
      {/* 备份提醒 */}
      {showReminder && (
        <div className="backup-reminder">
          <div className="reminder-icon">💾</div>
          <div className="reminder-content">
            <strong>建议备份数据</strong>
            <p>您有 {eventCount} 个事件，建议定期备份以防数据丢失</p>
          </div>
          <div className="reminder-actions">
            <button className="btn-backup-now" onClick={handleBackupNow}>
              立即备份
            </button>
            <button className="btn-remind-later" onClick={handleRemindLater}>
              3天后提醒
            </button>
            <button className="btn-dismiss" onClick={handleDismiss}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* 存储空间警告 */}
      {storageWarning && (
        <div className="backup-reminder warning">
          <div className="reminder-icon">⚠️</div>
          <div className="reminder-content">
            <strong>存储空间不足</strong>
            <p>数据量接近浏览器限制，请立即备份并清理已完成的事件</p>
          </div>
          <div className="reminder-actions">
            <button className="btn-backup-now urgent" onClick={handleBackupNow}>
              立即备份
            </button>
            <button className="btn-dismiss" onClick={() => setStorageWarning(false)}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}







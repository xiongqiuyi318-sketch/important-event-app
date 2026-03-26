import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';
import { getCompletedEventsCount, deleteAllCompletedEvents } from '../services/eventStorageService';
import './MonthlyCleanupReminder.css';

const CLEANUP_REMINDER_KEY = 'monthly_cleanup_reminder';

interface CleanupReminderState {
  lastReminderMonth: string; // 格式: "2025-01"
  skipThisMonth: boolean;
}

export default function MonthlyCleanupReminder() {
  const navigate = useNavigate();
  const { canEdit } = useAccess();
  const [showModal, setShowModal] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [skipThisMonth, setSkipThisMonth] = useState(false);

  useEffect(() => {
    void checkShouldShowReminder();
  }, []);

  const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const checkShouldShowReminder = async () => {
    const currentMonth = getCurrentMonth();
    const currentDay = new Date().getDate();

    // 只在每月1-3日提醒
    if (currentDay > 3) return;

    try {
      const savedState = localStorage.getItem(CLEANUP_REMINDER_KEY);
      if (savedState) {
        const state: CleanupReminderState = JSON.parse(savedState);
        
        // 如果是同一个月且已经跳过，不再提醒
        if (state.lastReminderMonth === currentMonth && state.skipThisMonth) {
          return;
        }
      }

      // 检查是否有已完成事件
      const count = await getCompletedEventsCount();
      if (count > 0) {
        setCompletedCount(count);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Failed to check cleanup reminder:', error);
    }
  };

  const saveReminderState = (skip: boolean) => {
    const state: CleanupReminderState = {
      lastReminderMonth: getCurrentMonth(),
      skipThisMonth: skip
    };
    localStorage.setItem(CLEANUP_REMINDER_KEY, JSON.stringify(state));
  };

  const handleViewList = () => {
    saveReminderState(true);
    setShowModal(false);
    navigate('/completed');
  };

  const handleSkip = () => {
    saveReminderState(skipThisMonth);
    setShowModal(false);
  };

  const handleDeleteAll = async () => {
    if (!canEdit) return;
    if (window.confirm(`确定要删除所有 ${completedCount} 个已完成事件吗？此操作无法撤销。`)) {
      const deleted = await deleteAllCompletedEvents();
      saveReminderState(true);
      setShowModal(false);
      alert(`已成功删除 ${deleted} 个已完成事件，释放了存储空间。`);
    }
  };

  if (!showModal) return null;

  return (
    <div className="cleanup-modal-overlay">
      <div className="cleanup-modal">
        <div className="cleanup-icon">🧹</div>
        <h2>月度清理提醒</h2>
        <p className="cleanup-message">
          您有 <strong>{completedCount}</strong> 个已完成的事件
          <br />
          是否删除以节省存储空间？
        </p>

        <label className="skip-checkbox">
          <input
            type="checkbox"
            checked={skipThisMonth}
            onChange={(e) => setSkipThisMonth(e.target.checked)}
          />
          本月不再提醒
        </label>

        <div className="cleanup-actions">
          <button className="btn-view" onClick={handleViewList}>
            查看列表
          </button>
          <button className="btn-skip" onClick={handleSkip}>
            暂不删除
          </button>
          <button className="btn-delete-all" onClick={() => void handleDeleteAll()} disabled={!canEdit}>
            全部删除
          </button>
        </div>
      </div>
    </div>
  );
}




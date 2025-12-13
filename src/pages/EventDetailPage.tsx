import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Event } from '../types';
import { loadEvents, updateEvent, deleteEvent } from '../utils/storage';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import EventForm from '../components/EventForm';
import './EventDetailPage.css';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newStepContent, setNewStepContent] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepContent, setEditingStepContent] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [editingReminderEnabled, setEditingReminderEnabled] = useState(false);

  const loadEventData = useCallback(() => {
    const events = loadEvents();
    const found = events.find(e => e.id === id);
    if (found) {
      setEvent(found);
    } else {
      navigate('/');
    }
  }, [id, navigate]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  if (!event) {
    return <div className="loading">加载中...</div>;
  }

  const daysUntilDeadline = event.deadline
    ? Math.ceil(
        (new Date(event.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const completedSteps = event.steps.filter(s => s.completed).length;
  const totalSteps = event.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const priorityLabels: Record<number, string> = {
    1: '紧急且重要',
    2: '重要',
    3: '一般',
    4: '不紧急不重要'
  };

  const priorityColors: Record<number, string> = {
    1: '#ff4444',
    2: '#ff8800',
    3: '#4488ff',
    4: '#888888'
  };

  const handleDelete = () => {
    if (window.confirm(`确定要删除事件"${event.title}"吗？此操作无法撤销。`)) {
      deleteEvent(event.id);
      navigate('/');
    }
  };

  const handleToggleStep = (stepId: string) => {
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    const allCompleted = updatedSteps.every(step => step.completed);
    updateEvent(event.id, { steps: updatedSteps, completed: allCompleted });
    loadEventData();
  };

  const handleAddStep = () => {
    if (newStepContent.trim()) {
      const newStep = {
        id: `step-${Date.now()}`,
        content: newStepContent.trim(),
        completed: false,
        order: event.steps.length
      };
      updateEvent(event.id, { steps: [...event.steps, newStep] });
      setNewStepContent('');
      setShowAddStep(false);
      loadEventData();
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (window.confirm('确定要删除这个步骤吗？')) {
      const updatedSteps = event.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index }));
      updateEvent(event.id, { steps: updatedSteps });
      loadEventData();
    }
  };

  const handleUpdateStepContent = (stepId: string) => {
    if (editingStepContent.trim()) {
      const updatedSteps = event.steps.map(step =>
        step.id === stepId ? { ...step, content: editingStepContent.trim() } : step
      );
      updateEvent(event.id, { steps: updatedSteps });
      setEditingStepId(null);
      setEditingStepContent('');
      loadEventData();
    }
  };

  const handleUpdateStepStatus = (stepId: string) => {
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, status: editingStatus.trim() || undefined } : step
    );
    updateEvent(event.id, { steps: updatedSteps });
    setEditingStatusId(null);
    setEditingStatus('');
    loadEventData();
  };

  const handleUpdateStepTime = (stepId: string) => {
    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? {
        ...step,
        scheduledTime: editingTime ? new Date(editingTime).toISOString() : undefined,
        reminderEnabled: editingReminderEnabled
      } : step
    );
    updateEvent(event.id, { steps: updatedSteps });
    setEditingTimeId(null);
    setEditingTime('');
    setEditingReminderEnabled(false);
    loadEventData();
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const sortedSteps = [...event.steps].sort((a, b) => a.order - b.order);
    const index = sortedSteps.findIndex(s => s.id === stepId);
    if (
      (direction === 'up' && index <= 0) ||
      (direction === 'down' && index >= sortedSteps.length - 1)
    ) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = sortedSteps[index].order;
    sortedSteps[index].order = sortedSteps[swapIndex].order;
    sortedSteps[swapIndex].order = temp;

    updateEvent(event.id, { steps: sortedSteps });
    loadEventData();
  };

  const handleMarkComplete = () => {
    updateEvent(event.id, { completed: true });
    navigate('/');
  };

  if (showEditForm) {
    return (
      <div className="event-detail-page">
        <EventForm
          event={event}
          onSave={() => {
            setShowEditForm(false);
            loadEventData();
          }}
          onCancel={() => setShowEditForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <div className="detail-actions">
          <button className="btn-edit" onClick={() => setShowEditForm(true)}>
            ✏️ 编辑事件
          </button>
          <button className="btn-complete" onClick={handleMarkComplete}>
            ✅ 标记完成
          </button>
          <button className="btn-delete" onClick={handleDelete}>
            🗑️ 删除
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <h1 className={`detail-title ${isOverdue ? 'overdue-text' : ''}`}>
            {event.title}
          </h1>

          <div className="detail-tags">
            <span 
              className="tag priority-tag"
              style={{ backgroundColor: priorityColors[event.priority], color: '#fff' }}
            >
              {priorityLabels[event.priority]}
            </span>
            <span className="tag category-tag">{event.category}</span>
            {event.completed && <span className="tag completed-tag">已完成</span>}
          </div>

          {event.description && (
            <div className="detail-description">
              <h3>📝 事件描述</h3>
              <p>{event.description}</p>
            </div>
          )}

          <div className="detail-time-info">
            {event.startTime && (
              <div className="time-item">
                <span className="time-label">🚀 开始时间：</span>
                <span className="time-value">
                  {format(new Date(event.startTime), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                </span>
              </div>
            )}
            {event.deadline && (
              <div className="time-item">
                <span className="time-label">⏰ 截止时间：</span>
                <span className={`time-value ${isOverdue ? 'overdue-text' : ''}`}>
                  {format(new Date(event.deadline), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                  {isOverdue ? (
                    <span className="days-badge overdue">已逾期 {Math.abs(daysUntilDeadline!)} 天</span>
                  ) : daysUntilDeadline !== null && (
                    <span className="days-badge">还剩 {daysUntilDeadline} 天</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="detail-progress">
            <div className="progress-header">
              <h3>📊 完成进度</h3>
              <span className="progress-percent">{progress}%</span>
            </div>
            <div className="progress-bar-large">
              <div className="progress-fill-large" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">已完成 {completedSteps}/{totalSteps} 个步骤</p>
          </div>
        </div>

        <div className="detail-steps">
          <div className="steps-header">
            <h3>📋 执行步骤</h3>
            <button 
              className="btn-add-step"
              onClick={() => setShowAddStep(true)}
            >
              + 添加步骤
            </button>
          </div>

          {showAddStep && (
            <div className="add-step-form">
              <input
                type="text"
                value={newStepContent}
                onChange={(e) => setNewStepContent(e.target.value)}
                placeholder="输入步骤内容..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddStep();
                  if (e.key === 'Escape') {
                    setShowAddStep(false);
                    setNewStepContent('');
                  }
                }}
                autoFocus
              />
              <button onClick={handleAddStep}>确定</button>
              <button onClick={() => { setShowAddStep(false); setNewStepContent(''); }}>取消</button>
            </div>
          )}

          <ul className="steps-list">
            {event.steps
              .sort((a, b) => a.order - b.order)
              .map((step, index) => {
                const isStepOverdue = step.scheduledTime && new Date(step.scheduledTime) < new Date() && !step.completed;
                return (
                  <li key={step.id} className={`step-item ${step.completed ? 'completed' : ''} ${isStepOverdue ? 'step-overdue' : ''}`}>
                    <div className="step-number">{index + 1}</div>
                    <div className="step-content">
                      <div className="step-main-row">
                        <label className="step-checkbox-only">
                          <input
                            type="checkbox"
                            checked={step.completed}
                            onChange={() => handleToggleStep(step.id)}
                          />
                        </label>
                        {editingStepId === step.id ? (
                          <div className="step-edit-container">
                            <input
                              type="text"
                              value={editingStepContent}
                              onChange={(e) => setEditingStepContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateStepContent(step.id);
                                if (e.key === 'Escape') {
                                  setEditingStepId(null);
                                  setEditingStepContent('');
                                }
                              }}
                              className="step-edit-input"
                              autoFocus
                            />
                            <button
                              className="btn-confirm-edit"
                              onClick={() => handleUpdateStepContent(step.id)}
                              title="确认修改"
                            >
                              ✓
                            </button>
                            <button
                              className="btn-cancel-edit"
                              onClick={() => {
                                setEditingStepId(null);
                                setEditingStepContent('');
                              }}
                              title="取消修改"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <span className={`step-text ${step.completed ? 'completed-text' : ''} ${isStepOverdue ? 'overdue-text' : ''}`}>
                            {step.content}
                          </span>
                        )}
                        <div className="step-actions">
                          <button
                            className="btn-step-action"
                            onClick={() => handleMoveStep(step.id, 'up')}
                            disabled={index === 0}
                            title="上移"
                          >↑</button>
                          <button
                            className="btn-step-action"
                            onClick={() => handleMoveStep(step.id, 'down')}
                            disabled={index === event.steps.length - 1}
                            title="下移"
                          >↓</button>
                          <button
                            className="btn-step-action edit"
                            onClick={() => {
                              setEditingStepId(step.id);
                              setEditingStepContent(step.content);
                            }}
                            title="编辑步骤"
                          >✏️</button>
                          <button
                            className="btn-step-action delete"
                            onClick={() => handleDeleteStep(step.id)}
                            title="删除步骤"
                          >×</button>
                        </div>
                      </div>

                      {step.scheduledTime && (
                        <div className={`step-time ${isStepOverdue ? 'overdue' : ''}`}>
                          ⏰ {format(new Date(step.scheduledTime), 'MM-dd HH:mm', { locale: zhCN })}
                          {step.reminderEnabled && <span className="reminder-badge">🔔</span>}
                        </div>
                      )}

                      {step.status && (
                        <div className="step-status">
                          <span className="status-label">状态：</span>
                          <span className="status-text">{step.status}</span>
                        </div>
                      )}

                      <div className="step-meta-actions">
                        {editingTimeId === step.id ? (
                          <div className="edit-time-form">
                            <input
                              type="datetime-local"
                              value={editingTime}
                              onChange={(e) => setEditingTime(e.target.value)}
                            />
                            <label>
                              <input
                                type="checkbox"
                                checked={editingReminderEnabled}
                                onChange={(e) => setEditingReminderEnabled(e.target.checked)}
                              />
                              启用提醒
                            </label>
                            <button onClick={() => handleUpdateStepTime(step.id)}>保存</button>
                            <button onClick={() => { setEditingTimeId(null); setEditingTime(''); }}>取消</button>
                          </div>
                        ) : (
                          <button
                            className="btn-meta"
                            onClick={() => {
                              setEditingTimeId(step.id);
                              setEditingTime(step.scheduledTime ? new Date(step.scheduledTime).toISOString().slice(0, 16) : '');
                              setEditingReminderEnabled(step.reminderEnabled || false);
                            }}
                          >
                            {step.scheduledTime ? '编辑时间' : '+ 设置时间'}
                          </button>
                        )}

                        {editingStatusId === step.id ? (
                          <div className="edit-status-form">
                            <textarea
                              value={editingStatus}
                              onChange={(e) => setEditingStatus(e.target.value)}
                              placeholder="描述步骤状态..."
                              rows={2}
                            />
                            <button onClick={() => handleUpdateStepStatus(step.id)}>保存</button>
                            <button onClick={() => { setEditingStatusId(null); setEditingStatus(''); }}>取消</button>
                          </div>
                        ) : (
                          <button
                            className="btn-meta"
                            onClick={() => {
                              setEditingStatusId(step.id);
                              setEditingStatus(step.status || '');
                            }}
                          >
                            {step.status ? '编辑状态' : '+ 添加状态'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>

          {event.steps.length === 0 && (
            <div className="no-steps">
              暂无执行步骤，点击上方按钮添加
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useState } from 'react';
import { Event } from '../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  isFirst: boolean;
  isLast: boolean;
  onToggleStep: (eventId: string, stepId: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddStep: (eventId: string, content: string) => void;
  onDeleteStep: (eventId: string, stepId: string) => void;
  onUpdateStepStatus: (eventId: string, stepId: string, status: string) => void;
  onMoveStepUp: (eventId: string, stepId: string) => void;
  onMoveStepDown: (eventId: string, stepId: string) => void;
  onUpdateStepContent: (eventId: string, stepId: string, content: string) => void;
  onUpdateStepTime: (eventId: string, stepId: string, scheduledTime: string | undefined, reminderEnabled: boolean, reminderType: 'sound' | 'vibration' | 'both') => void;
}

export default function EventCard({
  event,
  isFirst,
  isLast,
  onToggleStep,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddStep,
  onDeleteStep,
  onUpdateStepStatus,
  onMoveStepUp,
  onMoveStepDown,
  onUpdateStepContent,
  onUpdateStepTime,
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newStepContent, setNewStepContent] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [editingStepContentId, setEditingStepContentId] = useState<string | null>(null);
  const [editingStepContent, setEditingStepContent] = useState('');
  const [editingStepTimeId, setEditingStepTimeId] = useState<string | null>(null);
  const [editingStepTime, setEditingStepTime] = useState('');
  const [editingStepReminderEnabled, setEditingStepReminderEnabled] = useState(false);
  const [editingStepReminderType, setEditingStepReminderType] = useState<'sound' | 'vibration' | 'both'>('sound');

  const handleAddStep = () => {
    if (newStepContent.trim()) {
      onAddStep(event.id, newStepContent.trim());
      setNewStepContent('');
      setShowAddStep(false);
    }
  };

  const daysUntilDeadline = event.deadline
    ? Math.ceil(
        (new Date(event.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const completedSteps = event.steps.filter(s => s.completed).length;
  const totalSteps = event.steps.length;

  return (
    <div className={`event-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="event-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <button className="btn-expand" title={isExpanded ? '折叠' : '展开'}>
          {isExpanded ? '▼' : '▶'}
        </button>
        <div className="event-card-title-section">
          <h3 className="event-title">{event.title}</h3>
          <span className="event-category">{event.category}</span>
          {!isExpanded && event.deadline && (
            <span className={`event-deadline-compact ${daysUntilDeadline < 3 ? 'urgent' : ''}`}>
              📅 {format(new Date(event.deadline), 'MM-dd HH:mm', { locale: zhCN })}
            </span>
          )}
          {!isExpanded && totalSteps > 0 && (
            <span className="event-progress-compact">
              ✓ {completedSteps}/{totalSteps}
            </span>
          )}
        </div>
        {isExpanded && (
          <div className="event-card-actions" onClick={(e) => e.stopPropagation()}>
            {!isFirst && (
              <button 
                className="btn-icon" 
                onClick={onMoveUp}
                title="上移"
              >
                ↑
              </button>
            )}
            {!isLast && (
              <button 
                className="btn-icon" 
                onClick={onMoveDown}
                title="下移"
              >
                ↓
              </button>
            )}
            <button 
              className="btn-icon btn-edit" 
              onClick={() => onEdit(event)}
              title="编辑"
            >
              ✏️
            </button>
            <button 
              className="btn-icon btn-delete" 
              onClick={() => onDelete(event.id)}
              title="删除事件"
            >
              🗑️ 删除
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {event.description && (
            <div className="event-description">{event.description}</div>
          )}

          {(event.startTime || event.deadline) && (
            <div className="event-meta">
          {event.startTime && (
            <div className="meta-item">
              <strong>开始：</strong>
              {format(new Date(event.startTime), 'MM-dd HH:mm', { locale: zhCN })}
              {event.startTimeReminderEnabled && (
                <span className="event-reminder-badge" title="已启用提醒">
                  {event.startTimeReminderType === 'sound' ? '🔔' : event.startTimeReminderType === 'vibration' ? '📳' : '🔔📳'}
                </span>
              )}
            </div>
          )}
          {event.deadline && (
            <div className="meta-item">
              <strong>截止：</strong>
              <span className={daysUntilDeadline < 3 ? 'deadline-warning' : ''}>
                {format(new Date(event.deadline), 'MM-dd HH:mm', { locale: zhCN })}
              </span>
              {event.deadlineReminderEnabled && (
                <span className="event-reminder-badge" title="已启用提醒">
                  {event.deadlineReminderType === 'sound' ? '🔔' : event.deadlineReminderType === 'vibration' ? '📳' : '🔔📳'}
                </span>
              )}
              {daysUntilDeadline >= 0 && (
                <span className="days-left"> ({daysUntilDeadline}天后)</span>
              )}
              {daysUntilDeadline < 0 && (
                <span className="days-overdue"> (已过期{Math.abs(daysUntilDeadline)}天)</span>
              )}
            </div>
          )}
        </div>
      )}

          <div className="event-steps">
        <div className="steps-header">
          <strong>完成步骤：</strong>
          {!showAddStep && (
            <button 
              className="btn-add-step"
              onClick={() => setShowAddStep(true)}
            >
              + 添加步骤
            </button>
          )}
        </div>
        
        {showAddStep && (
          <div className="add-step-input">
            <input
              type="text"
              value={newStepContent}
              onChange={(e) => setNewStepContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddStep();
                } else if (e.key === 'Escape') {
                  setShowAddStep(false);
                  setNewStepContent('');
                }
              }}
              placeholder="输入步骤内容，回车添加"
              autoFocus
            />
            <button onClick={handleAddStep}>确定</button>
            <button onClick={() => {
              setShowAddStep(false);
              setNewStepContent('');
            }}>取消</button>
          </div>
        )}

        {event.steps && event.steps.length > 0 ? (
          <ul className="steps-list">
            {event.steps
              .sort((a, b) => a.order - b.order)
              .map((step, stepIndex) => {
                const sortedSteps = [...event.steps].sort((a, b) => a.order - b.order);
                const isStepFirst = stepIndex === 0;
                const isStepLast = stepIndex === sortedSteps.length - 1;
                return (
                <li key={step.id} className="step-item">
                  <div className="step-main">
                    <div className="step-order-controls">
                      {!isStepFirst && (
                        <button
                          className="btn-step-move"
                          onClick={() => onMoveStepUp(event.id, step.id)}
                          title="上移"
                        >
                          ↑
                        </button>
                      )}
                      {!isStepLast && (
                        <button
                          className="btn-step-move"
                          onClick={() => onMoveStepDown(event.id, step.id)}
                          title="下移"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                    <label className="step-checkbox">
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={() => onToggleStep(event.id, step.id)}
                      />
                      {editingStepContentId === step.id ? (
                        <input
                          type="text"
                          value={editingStepContent}
                          onChange={(e) => setEditingStepContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdateStepContent(event.id, step.id, editingStepContent.trim());
                              setEditingStepContentId(null);
                              setEditingStepContent('');
                            } else if (e.key === 'Escape') {
                              setEditingStepContentId(null);
                              setEditingStepContent('');
                            }
                          }}
                          className="step-content-edit-input"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          className={step.completed ? 'step-completed' : ''}
                          onDoubleClick={() => {
                            setEditingStepContentId(step.id);
                            setEditingStepContent(step.content);
                          }}
                          title="双击编辑"
                        >
                          {step.content}
                        </span>
                      )}
                    </label>
                    <div className="step-actions">
                      <button
                        className="btn-edit-step-content"
                        onClick={() => {
                          setEditingStepContentId(step.id);
                          setEditingStepContent(step.content);
                        }}
                        title="编辑步骤"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete-step-small"
                        onClick={() => onDeleteStep(event.id, step.id)}
                        title="删除步骤"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {editingStepTimeId === step.id ? (
                    <div className="step-time-edit">
                      <div className="step-time-input-group">
                        <label>计划时间：</label>
                        <input
                          type="datetime-local"
                          value={editingStepTime}
                          onChange={(e) => setEditingStepTime(e.target.value)}
                          className="step-time-input"
                        />
                      </div>
                      <div className="step-reminder-settings">
                        <label className="step-reminder-checkbox">
                          <input
                            type="checkbox"
                            checked={editingStepReminderEnabled}
                            onChange={(e) => setEditingStepReminderEnabled(e.target.checked)}
                          />
                          <span>启用提醒</span>
                        </label>
                        {editingStepReminderEnabled && (
                          <div className="step-reminder-type">
                            <label>
                              <input
                                type="radio"
                                name={`reminder-${step.id}`}
                                checked={editingStepReminderType === 'sound'}
                                onChange={() => setEditingStepReminderType('sound')}
                              />
                              铃声
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`reminder-${step.id}`}
                                checked={editingStepReminderType === 'vibration'}
                                onChange={() => setEditingStepReminderType('vibration')}
                              />
                              振动
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`reminder-${step.id}`}
                                checked={editingStepReminderType === 'both'}
                                onChange={() => setEditingStepReminderType('both')}
                              />
                              铃声+振动
                            </label>
                          </div>
                        )}
                      </div>
                      <div className="step-time-actions">
                        <button
                          className="btn-save-status"
                          onClick={() => {
                            onUpdateStepTime(
                              event.id,
                              step.id,
                              editingStepTime || undefined,
                              editingStepReminderEnabled,
                              editingStepReminderType
                            );
                            setEditingStepTimeId(null);
                            setEditingStepTime('');
                            setEditingStepReminderEnabled(false);
                            setEditingStepReminderType('sound');
                          }}
                        >
                          保存
                        </button>
                        <button
                          className="btn-cancel-status"
                          onClick={() => {
                            setEditingStepTimeId(null);
                            setEditingStepTime('');
                            setEditingStepReminderEnabled(false);
                            setEditingStepReminderType('sound');
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="step-time-section">
                      {step.scheduledTime ? (
                        <div className="step-time-display">
                          <span className="step-time-label">计划时间：</span>
                          <span className="step-time-text">
                            {format(new Date(step.scheduledTime), 'MM-dd HH:mm', { locale: zhCN })}
                          </span>
                          {step.reminderEnabled && (
                            <span className="step-reminder-badge">
                              {step.reminderType === 'sound' ? '🔔' : step.reminderType === 'vibration' ? '📳' : '🔔📳'}
                            </span>
                          )}
                          <button
                            className="btn-edit-status"
                            onClick={() => {
                              setEditingStepTimeId(step.id);
                              setEditingStepTime(step.scheduledTime ? new Date(step.scheduledTime).toISOString().slice(0, 16) : '');
                              setEditingStepReminderEnabled(step.reminderEnabled || false);
                              setEditingStepReminderType(step.reminderType || 'sound');
                            }}
                            title="编辑时间"
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-add-status"
                          onClick={() => {
                            setEditingStepTimeId(step.id);
                            setEditingStepTime('');
                            setEditingStepReminderEnabled(false);
                            setEditingStepReminderType('sound');
                          }}
                          title="设置时间"
                        >
                          + 设置时间
                        </button>
                      )}
                    </div>
                  )}
                  {editingStepId === step.id ? (
                    <div className="step-status-edit">
                      <textarea
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                        placeholder="描述该步骤的完成情况..."
                        rows={2}
                        className="step-status-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingStepId(null);
                            setEditingStatus('');
                          }
                        }}
                        autoFocus
                      />
                      <div className="step-status-actions">
                        <button
                          className="btn-save-status"
                          onClick={() => {
                            onUpdateStepStatus(event.id, step.id, editingStatus.trim());
                            setEditingStepId(null);
                            setEditingStatus('');
                          }}
                        >
                          保存
                        </button>
                        <button
                          className="btn-cancel-status"
                          onClick={() => {
                            setEditingStepId(null);
                            setEditingStatus('');
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="step-status-section">
                      {step.status ? (
                        <div className="step-status-display">
                          <span className="step-status-label">状态：</span>
                          <span className="step-status-text">{step.status}</span>
                          <button
                            className="btn-edit-status"
                            onClick={() => {
                              setEditingStepId(step.id);
                              setEditingStatus(step.status || '');
                            }}
                            title="编辑状态"
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-add-status"
                          onClick={() => {
                            setEditingStepId(step.id);
                            setEditingStatus('');
                          }}
                          title="添加状态描述"
                        >
                          + 添加状态
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
              })}
          </ul>
        ) : (
          <div className="no-steps">暂无步骤</div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

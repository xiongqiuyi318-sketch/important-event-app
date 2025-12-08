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
}: EventCardProps) {
  const [newStepContent, setNewStepContent] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);

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

  return (
    <div className="event-card">
      <div className="event-card-header">
        <div className="event-card-title-section">
          <h3 className="event-title">{event.title}</h3>
          <span className="event-category">{event.category}</span>
        </div>
        <div className="event-card-actions">
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
      </div>

      {event.description && (
        <div className="event-description">{event.description}</div>
      )}

      {(event.startTime || event.deadline) && (
        <div className="event-meta">
          {event.startTime && (
            <div className="meta-item">
              <strong>开始：</strong>
              {format(new Date(event.startTime), 'MM-dd HH:mm', { locale: zhCN })}
            </div>
          )}
          {event.deadline && (
            <div className="meta-item">
              <strong>截止：</strong>
              <span className={daysUntilDeadline < 3 ? 'deadline-warning' : ''}>
                {format(new Date(event.deadline), 'MM-dd HH:mm', { locale: zhCN })}
              </span>
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
              .map((step) => (
                <li key={step.id} className="step-item">
                  <label className="step-checkbox">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() => onToggleStep(event.id, step.id)}
                    />
                    <span className={step.completed ? 'step-completed' : ''}>
                      {step.content}
                    </span>
                  </label>
                  <button
                    className="btn-delete-step-small"
                    onClick={() => onDeleteStep(event.id, step.id)}
                    title="删除步骤"
                  >
                    ×
                  </button>
                </li>
              ))}
          </ul>
        ) : (
          <div className="no-steps">暂无步骤</div>
        )}
      </div>
    </div>
  );
}

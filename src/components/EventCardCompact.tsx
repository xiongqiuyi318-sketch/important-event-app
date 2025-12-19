import { useNavigate } from 'react-router-dom';
import { Event } from '../types';
import './EventCardCompact.css';

interface EventCardCompactProps {
  event: Event;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export default function EventCardCompact({ 
  event, 
  onMoveUp, 
  onMoveDown, 
  canMoveUp = false, 
  canMoveDown = false 
}: EventCardCompactProps) {
  const navigate = useNavigate();

  const daysUntilDeadline = event.deadline
    ? Math.ceil(
        (new Date(event.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const completedSteps = event.steps.filter(s => s.completed).length;
  const totalSteps = event.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (canMoveUp && onMoveUp) {
      onMoveUp();
    }
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (canMoveDown && onMoveDown) {
      onMoveDown();
    }
  };

  return (
    <div 
      className={`event-card-compact ${isOverdue ? 'overdue' : ''}`}
      onClick={handleClick}
    >
      <div className="compact-header">
        <h3 className={`compact-title ${isOverdue ? 'overdue-text' : ''}`}>
          {event.title}
        </h3>
        <span className="compact-category">{event.category}</span>
        {(onMoveUp || onMoveDown) && (
          <div className="sort-buttons" onClick={(e) => e.stopPropagation()}>
            <button 
              className="sort-btn" 
              onClick={handleMoveUp} 
              disabled={!canMoveUp}
              title="上移"
            >
              ↑
            </button>
            <button 
              className="sort-btn" 
              onClick={handleMoveDown} 
              disabled={!canMoveDown}
              title="下移"
            >
              ↓
            </button>
          </div>
        )}
      </div>
      
      <div className="compact-footer">
        {event.deadline && (
          <span className={`compact-deadline ${isOverdue ? 'overdue-text' : daysUntilDeadline !== null && daysUntilDeadline <= 3 ? 'urgent' : ''}`}>
            {isOverdue ? (
              <>🔴 已逾期 {Math.abs(daysUntilDeadline!)} 天</>
            ) : (
              <>📅 {daysUntilDeadline === 0 ? '今天截止' : `还剩 ${daysUntilDeadline} 天`}</>
            )}
          </span>
        )}
        
        {totalSteps > 0 && (
          <div className="compact-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{completedSteps}/{totalSteps}</span>
          </div>
        )}
      </div>
    </div>
  );
}


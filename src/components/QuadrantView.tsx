import { Event, EventPriority } from '../types';
import EventCard from './EventCard';
import './QuadrantView.css';

interface QuadrantViewProps {
  eventsByPriority: {
    1: Event[];
    2: Event[];
    3: Event[];
    4: Event[];
  };
  onToggleStep: (eventId: string, stepId: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onMoveEvent: (id: string, direction: 'up' | 'down', priority: number) => void;
  onAddStep: (eventId: string, content: string) => void;
  onDeleteStep: (eventId: string, stepId: string) => void;
}

const quadrantConfig = {
  1: { title: '重要且紧急', color: '#ff4444', priority: 1 as EventPriority },
  2: { title: '重要', color: '#ff8800', priority: 2 as EventPriority },
  3: { title: '一般', color: '#4488ff', priority: 3 as EventPriority },
  4: { title: '不重要', color: '#888888', priority: 4 as EventPriority },
};

export default function QuadrantView({
  eventsByPriority,
  onToggleStep,
  onEdit,
  onDelete,
  onMoveEvent,
  onAddStep,
  onDeleteStep,
}: QuadrantViewProps) {
  return (
    <div className="quadrant-view">
      <div className="quadrant-grid">
        {[1, 2, 3, 4].map((priority) => {
          const config = quadrantConfig[priority as keyof typeof quadrantConfig];
          const events = eventsByPriority[priority as EventPriority];

          return (
            <div key={priority} className="quadrant" data-priority={priority}>
              <div 
                className="quadrant-header"
                style={{ 
                  borderColor: config.color,
                  color: priority === 1 ? config.color : undefined
                }}
              >
                <h2>{config.title}</h2>
                <span className="event-count">({events.length})</span>
              </div>
              <div className="quadrant-content">
                {events.length === 0 ? (
                  <div className="empty-quadrant">暂无事件</div>
                ) : (
                  events.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isFirst={index === 0}
                      isLast={index === events.length - 1}
                      onToggleStep={onToggleStep}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onMoveUp={() => onMoveEvent(event.id, 'up', priority)}
                      onMoveDown={() => onMoveEvent(event.id, 'down', priority)}
                      onAddStep={onAddStep}
                      onDeleteStep={onDeleteStep}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

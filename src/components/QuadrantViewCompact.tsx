import { Event, EventPriority } from '../types';
import EventCardCompact from './EventCardCompact';
import './QuadrantViewCompact.css';

interface QuadrantViewCompactProps {
  eventsByPriority: {
    1: Event[];
    2: Event[];
    3: Event[];
    4: Event[];
  };
  onEventReorder?: (eventId: string, direction: 'up' | 'down', priority: EventPriority) => void;
}

const quadrantConfig = {
  1: { title: '紧急且重要', icon: '🔴', color: '#ff4444', priority: 1 as EventPriority },
  2: { title: '重要', icon: '🟠', color: '#ff8800', priority: 2 as EventPriority },
  3: { title: '一般', icon: '🔵', color: '#4488ff', priority: 3 as EventPriority },
  4: { title: '不紧急不重要', icon: '⚪', color: '#888888', priority: 4 as EventPriority },
};

export default function QuadrantViewCompact({ eventsByPriority, onEventReorder }: QuadrantViewCompactProps) {
  return (
    <div className="quadrant-view-compact">
      <div className="quadrant-grid-compact">
        {[1, 2, 3, 4].map((priority) => {
          const config = quadrantConfig[priority as keyof typeof quadrantConfig];
          const events = eventsByPriority[priority as EventPriority];

          return (
            <div key={priority} className="quadrant-compact" data-priority={priority}>
              <div 
                className="quadrant-header-compact"
                style={{ borderColor: config.color }}
              >
                <span className="quadrant-icon">{config.icon}</span>
                <h2 style={{ color: priority === 1 ? config.color : undefined }}>
                  {config.title}
                </h2>
                <span className="event-count-compact">({events.length})</span>
              </div>
              <div className="quadrant-content-compact">
                {events.length === 0 ? (
                  <div className="empty-quadrant-compact">暂无事件</div>
                ) : (
                  events.map((event, index) => (
                    <EventCardCompact
                      key={event.id}
                      event={event}
                      onMoveUp={onEventReorder ? () => onEventReorder(event.id, 'up', priority as EventPriority) : undefined}
                      onMoveDown={onEventReorder ? () => onEventReorder(event.id, 'down', priority as EventPriority) : undefined}
                      canMoveUp={index > 0}
                      canMoveDown={index < events.length - 1}
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




import { useState, useEffect } from 'react';
import { Event } from '../types';
import { loadEvents, deleteEvent } from '../utils/storage';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './HistoryPage.css';

export default function HistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadHistoryEvents();
  }, []);

  const loadHistoryEvents = () => {
    const allEvents = loadEvents();
    // 只显示已完成或过期的事件
    const historyEvents = allEvents
      .filter(e => e.completed || e.expired)
      .sort((a, b) => {
        // 按完成时间或过期时间倒序
        const aTime = a.completed 
          ? new Date(a.createdAt).getTime() 
          : (a.deadline ? new Date(a.deadline).getTime() : 0);
        const bTime = b.completed 
          ? new Date(b.createdAt).getTime() 
          : (b.deadline ? new Date(b.deadline).getTime() : 0);
        return bTime - aTime;
      });
    setEvents(historyEvents);
  };

  const handleDelete = (id: string) => {
    const event = events.find(e => e.id === id);
    const eventTitle = event ? event.title : '此事件';
    if (window.confirm(`确定要永久删除事件"${eventTitle}"吗？此操作无法撤销。`)) {
      deleteEvent(id);
      loadHistoryEvents();
    }
  };

  const getPriorityLabel = (priority: number) => {
    const labels = {
      1: '重要且紧急',
      2: '重要',
      3: '一般',
      4: '不重要'
    };
    return labels[priority as 1 | 2 | 3 | 4];
  };

  const getPriorityClass = (priority: number) => {
    return `priority-${priority}`;
  };

  return (
    <div className="history-page">
      <h2>历史事件</h2>
      {events.length === 0 ? (
        <div className="empty-state">暂无历史事件</div>
      ) : (
        <div className="history-list">
          {events.map(event => (
            <div key={event.id} className={`history-item ${event.completed ? 'completed' : 'expired'}`}>
              <div className="history-item-header">
                <div className="history-item-title">
                  <h3>{event.title}</h3>
                  <span className={`priority-badge ${getPriorityClass(event.priority)}`}>
                    {getPriorityLabel(event.priority)}
                  </span>
                  <span className="category-badge">{event.category}</span>
                </div>
                <button 
                  className="btn-delete"
                  onClick={() => handleDelete(event.id)}
                >
                  删除
                </button>
              </div>
              
              {event.description && (
                <div className="history-item-description">{event.description}</div>
              )}

              <div className="history-item-meta">
                {event.startTime && (
                  <span>
                    <strong>开始时间：</strong>
                    {format(new Date(event.startTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                )}
                {event.deadline && (
                  <span>
                    <strong>截止时间：</strong>
                    {format(new Date(event.deadline), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                )}
                <span className={event.completed ? 'status-completed' : 'status-expired'}>
                  {event.completed ? '已完成' : (event.expired ? '已过期' : '无截止日期')}
                </span>
              </div>

              {event.steps && event.steps.length > 0 && (
                <div className="history-item-steps">
                  <strong>完成步骤：</strong>
                  <ul>
                    {event.steps.map((step) => (
                      <li 
                        key={step.id} 
                        className={step.completed ? 'completed-step' : ''}
                      >
                        {step.content}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, EventPriority } from '../types';
import { loadEvents, getCompletedEventsCount } from '../utils/storage';
import EventForm from '../components/EventForm';
import QuadrantViewCompact from '../components/QuadrantViewCompact';
import DataManager from '../components/DataManager';
import CalendarSyncButton from '../components/CalendarSyncButton';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const loadEventsData = useCallback(() => {
    const loadedEvents = loadEvents();
    const activeEvents = loadedEvents.filter(e => !e.completed && !e.expired);
    setEvents(activeEvents);
    const completed = getCompletedEventsCount();
    setCompletedCount(completed);
  }, []);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  const handleEventSaved = useCallback(() => {
    loadEventsData();
    setShowForm(false);
    setEditingEvent(null);
  }, [loadEventsData]);

  const sortEvents = useCallback((a: Event, b: Event): number => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }, []);

  const eventsByPriority = useMemo(() => {
    const priorityGroups = {
      1: [] as Event[],
      2: [] as Event[],
      3: [] as Event[],
      4: [] as Event[],
    };
    
    events.forEach(event => {
      priorityGroups[event.priority as EventPriority].push(event);
    });
    
    return {
      1: priorityGroups[1].sort(sortEvents),
      2: priorityGroups[2].sort(sortEvents),
      3: priorityGroups[3].sort(sortEvents),
      4: priorityGroups[4].sort(sortEvents),
    };
  }, [events, sortEvents]);

  const stats = useMemo(() => ({
    total: events.length,
    urgent: eventsByPriority[1].length,
    important: eventsByPriority[2].length,
    normal: eventsByPriority[3].length,
    low: eventsByPriority[4].length,
  }), [events, eventsByPriority]);

  return (
    <div className="home-page">
      {/* 紧凑统计栏 */}
      <div className="stats-bar-compact">
        <div className="stats-info">
          <span className="stats-label">📋 待办 ({stats.total})</span>
          <span className="stats-dots">
            <span className="dot-item" title="紧急">🔴{stats.urgent}</span>
            <span className="dot-item" title="重要">🟠{stats.important}</span>
            <span className="dot-item" title="一般">🔵{stats.normal}</span>
            <span className="dot-item" title="其他">⚪{stats.low}</span>
          </span>
        </div>
        <button 
          className="completed-btn"
          onClick={() => navigate('/completed')}
        >
          ✅ 已完成 ({completedCount}) →
        </button>
      </div>

      {/* 紧凑操作栏 */}
      <div className="action-bar-compact">
        <button 
          className="btn-action" 
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
        >
          + 新建
        </button>
        <CalendarSyncButton variant="all" />
        <DataManager onDataChanged={loadEventsData} />
      </div>

      {showForm && (
        <EventForm
          event={editingEvent || undefined}
          onSave={handleEventSaved}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      <QuadrantViewCompact eventsByPriority={eventsByPriority} />
    </div>
  );
}

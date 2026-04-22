import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Event, EventPriority } from '../types';
import { useAccess } from '../context/AccessContext';
import { loadEvents, reorderEvents } from '../services/eventStorageService';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm';
import QuadrantViewCompact from '../components/QuadrantViewCompact';
import DataManager from '../components/DataManager';
import CalendarSyncButton from '../components/CalendarSyncButton';
import './HomePage.css';

export default function HomePage() {
  const { companyId = 'akp' } = useParams<{ companyId: string }>();
  const isEventUpdated = useCallback((event: Event): boolean => {
    if (!event.updatedAt) return false;
    return new Date(event.updatedAt).getTime() > new Date(event.createdAt).getTime() + 1000;
  }, []);

  const navigate = useNavigate();
  const { canEdit } = useAccess();
  const [events, setEvents] = useState<Event[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showUpdatedOnly, setShowUpdatedOnly] = useState(false);

  const loadEventsData = useCallback(async () => {
    const loadedEvents = await loadEvents(companyId);
    const activeEvents = loadedEvents.filter(e => !e.completed && !e.expired);
    setEvents(activeEvents);
    const completed = loadedEvents.filter((e) => e.completed).length;
    setCompletedCount(completed);
  }, [companyId]);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = client
      .channel('events-home-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `company_id=eq.${companyId}` },
        () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void loadEventsData();
        }, 180);
      }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void client.removeChannel(channel);
    };
  }, [companyId, loadEventsData]);

  const handleEventSaved = useCallback(async (_savedEvent?: Event) => {
    await loadEventsData();
    setShowForm(false);
    setEditingEvent(null);
  }, [loadEventsData]);

  const handleEventReorder = useCallback(
    async (eventId: string, direction: 'up' | 'down', priority: EventPriority) => {
      const ok = await reorderEvents(eventId, direction, priority);
      if (ok) {
        await loadEventsData();
      }
    },
    [loadEventsData]
  );

  const sortEvents = useCallback((a: Event, b: Event): number => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }, []);

  const eventsByPriority = useMemo(() => {
    const filteredEvents = showUpdatedOnly
      ? events.filter(isEventUpdated)
      : events;

    const priorityGroups = {
      1: [] as Event[],
      2: [] as Event[],
      3: [] as Event[],
      4: [] as Event[],
    };
    
    filteredEvents.forEach(event => {
      priorityGroups[event.priority as EventPriority].push(event);
    });
    
    return {
      1: priorityGroups[1].sort(sortEvents),
      2: priorityGroups[2].sort(sortEvents),
      3: priorityGroups[3].sort(sortEvents),
      4: priorityGroups[4].sort(sortEvents),
    };
  }, [events, sortEvents, showUpdatedOnly, isEventUpdated]);

  const stats = useMemo(() => ({
    total: events.length,
    urgent: eventsByPriority[1].length,
    important: eventsByPriority[2].length,
    normal: eventsByPriority[3].length,
    low: eventsByPriority[4].length,
    updated: events.filter(isEventUpdated).length,
  }), [events, eventsByPriority, isEventUpdated]);

  return (
    <div className="home-page">
      {/* 紧凑统计栏 */}
      <div className="stats-bar-compact">
        <div className="stats-info">
          <span className="stats-label">📋 待办 ({stats.total})</span>
          <span className="stats-dots">
            <span className="dot-item" title="紧急且重要">🔴紧急 {stats.urgent}</span>
            <span className="dot-item" title="重要">🟠重要 {stats.important}</span>
            <span className="dot-item" title="一般">🔵一般 {stats.normal}</span>
            <span className="dot-item" title="不紧急不重要">⚪不紧急不重要 {stats.low}</span>
            <span className="dot-item updated" title="已更新">🟡已更新 {stats.updated}</span>
          </span>
        </div>
        <button 
          className="completed-btn"
          onClick={() => navigate(`/companies/${companyId}/completed`)}
        >
          ✅ 已完成 ({completedCount}) →
        </button>
      </div>

      {/* 紧凑操作栏 */}
      <div className="action-bar-compact">
        <button 
          className="btn-action" 
          disabled={!canEdit}
          onClick={() => {
            if (!canEdit) return;
            setEditingEvent(null);
            setShowForm(true);
          }}
        >
          + 新建
        </button>
        <button
          className={`btn-filter ${showUpdatedOnly ? 'active' : ''}`}
          onClick={() => setShowUpdatedOnly((prev) => !prev)}
          title="切换只看已更新事件"
        >
          {showUpdatedOnly ? '✅ 只看已更新' : '🟡 只看已更新'}
        </button>
        <CalendarSyncButton variant="all" />
        <DataManager onDataChanged={() => void loadEventsData()} canEdit={canEdit} />
      </div>

      {showForm && (
        <EventForm
          companyId={companyId}
          event={editingEvent || undefined}
          onSave={(savedEvent) => void handleEventSaved(savedEvent)}
          canEdit={canEdit}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      <QuadrantViewCompact 
        companyId={companyId}
        eventsByPriority={eventsByPriority} 
        onEventReorder={handleEventReorder}
        canEdit={canEdit}
      />
    </div>
  );
}

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
    // 过滤掉已完成和过期的事件
    const activeEvents = loadedEvents.filter(e => !e.completed && !e.expired);
    setEvents(activeEvents);
    
    // 获取已完成事件数量
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

  // 事件排序函数（按sortOrder优先，再按创建时间）
  const sortEvents = useCallback((a: Event, b: Event): number => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }, []);

  // 按优先级分组事件（使用useMemo优化性能）
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

  // 统计数据
  const stats = useMemo(() => ({
    total: events.length,
    urgent: eventsByPriority[1].length,
    important: eventsByPriority[2].length,
    normal: eventsByPriority[3].length,
    low: eventsByPriority[4].length,
  }), [events, eventsByPriority]);

  return (
    <div className="home-page">
      {/* 统计栏 */}
      <div className="stats-bar">
        <div className="stats-left">
          <div className="stats-title">
            <span className="stats-icon">📋</span>
            <span>待办事件</span>
            <span className="stats-total">({stats.total})</span>
          </div>
          <div className="stats-breakdown">
            <span className="stat-item urgent">
              <span className="stat-dot" style={{ background: '#ff4444' }}></span>
              紧急 {stats.urgent}
            </span>
            <span className="stat-item important">
              <span className="stat-dot" style={{ background: '#ff8800' }}></span>
              重要 {stats.important}
            </span>
            <span className="stat-item normal">
              <span className="stat-dot" style={{ background: '#4488ff' }}></span>
              一般 {stats.normal}
            </span>
            <span className="stat-item low">
              <span className="stat-dot" style={{ background: '#888888' }}></span>
              其他 {stats.low}
            </span>
          </div>
        </div>
        <div className="stats-right">
          <button 
            className="completed-link"
            onClick={() => navigate('/completed')}
          >
            ✅ 已完成 ({completedCount})
            <span className="arrow">→</span>
          </button>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="page-header">
        <div className="header-left">
          <button 
            className="btn-primary" 
            onClick={() => {
              setEditingEvent(null);
              setShowForm(true);
            }}
          >
            + 新建事件
          </button>
          <CalendarSyncButton variant="all" />
        </div>
        <DataManager onDataChanged={loadEventsData} />
      </div>

      {/* 说明文字 */}
      <div className="quadrant-intro">
        ⚠️ 时间管理四象限根据事件的紧急程度和重要程度进行分类管理
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

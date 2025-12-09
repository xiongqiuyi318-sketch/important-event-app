import { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, EventPriority } from '../types';
import { loadEvents, updateEvent, deleteEvent, reorderEvents } from '../utils/storage';
import EventForm from '../components/EventForm';
import QuadrantView from '../components/QuadrantView';
import DataManager from '../components/DataManager';
import './HomePage.css';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEventsData();
  }, []);

  const loadEventsData = useCallback(() => {
    const loadedEvents = loadEvents();
    // 过滤掉已完成和过期的事件
    const activeEvents = loadedEvents.filter(e => !e.completed && !e.expired);
    setEvents(activeEvents);
  }, []);

  const handleEventSaved = useCallback(() => {
    loadEventsData();
    setShowForm(false);
    setEditingEvent(null);
  }, [loadEventsData]);

  const handleEdit = useCallback((event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const event = events.find(e => e.id === id);
    const eventTitle = event ? event.title : '此事件';
    if (window.confirm(`确定要删除事件"${eventTitle}"吗？此操作无法撤销。`)) {
      deleteEvent(id);
      loadEventsData();
    }
  }, [events, loadEventsData]);

  const handleToggleStep = useCallback((eventId: string, stepId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );

    // 检查是否所有步骤都完成了
    const allCompleted = updatedSteps.every(step => step.completed);
    
    updateEvent(eventId, {
      steps: updatedSteps,
      completed: allCompleted
    });

    loadEventsData();
  }, [events, loadEventsData]);

  const handleMoveEvent = useCallback((id: string, direction: 'up' | 'down', priority: number) => {
    reorderEvents(id, direction, priority);
    loadEventsData();
  }, [loadEventsData]);

  const handleAddStep = useCallback((eventId: string, content: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newStep = {
      id: `step-${Date.now()}`,
      content,
      completed: false,
      order: event.steps.length
    };

    updateEvent(eventId, {
      steps: [...event.steps, newStep]
    });

    loadEventsData();
  }, [events, loadEventsData]);

  const handleDeleteStep = useCallback((eventId: string, stepId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedSteps = event.steps.filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, order: index }));

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

  const handleUpdateStepStatus = useCallback((eventId: string, stepId: string, status: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, status: status || undefined } : step
    );

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

  const handleMoveStepUp = useCallback((eventId: string, stepId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const sortedSteps = [...event.steps].sort((a, b) => a.order - b.order);
    const stepIndex = sortedSteps.findIndex(s => s.id === stepId);
    
    if (stepIndex <= 0) return; // 已经是第一个

    const currentStep = sortedSteps[stepIndex];
    const previousStep = sortedSteps[stepIndex - 1];

    const updatedSteps = event.steps.map(step => {
      if (step.id === currentStep.id) {
        return { ...step, order: previousStep.order };
      } else if (step.id === previousStep.id) {
        return { ...step, order: currentStep.order };
      }
      return step;
    });

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

  const handleMoveStepDown = useCallback((eventId: string, stepId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const sortedSteps = [...event.steps].sort((a, b) => a.order - b.order);
    const stepIndex = sortedSteps.findIndex(s => s.id === stepId);
    
    if (stepIndex < 0 || stepIndex >= sortedSteps.length - 1) return; // 已经是最后一个

    const currentStep = sortedSteps[stepIndex];
    const nextStep = sortedSteps[stepIndex + 1];

    const updatedSteps = event.steps.map(step => {
      if (step.id === currentStep.id) {
        return { ...step, order: nextStep.order };
      } else if (step.id === nextStep.id) {
        return { ...step, order: currentStep.order };
      }
      return step;
    });

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

  const handleUpdateStepContent = useCallback((eventId: string, stepId: string, content: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (!content.trim()) return; // 不允许空内容

    const updatedSteps = event.steps.map(step =>
      step.id === stepId ? { ...step, content: content.trim() } : step
    );

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

  const handleUpdateStepTime = useCallback((
    eventId: string,
    stepId: string,
    scheduledTime: string | undefined,
    reminderEnabled: boolean,
    reminderType: 'sound' | 'vibration' | 'both'
  ) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const updatedSteps = event.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
          reminderEnabled: reminderEnabled || undefined,
          reminderType: reminderEnabled ? reminderType : undefined,
        };
      }
      return step;
    });

    updateEvent(eventId, { steps: updatedSteps });
    loadEventsData();
  }, [events, loadEventsData]);

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

  return (
    <div className="home-page">
      <div className="page-header">
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
        >
          + 新增事件
        </button>
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

      <QuadrantView
        eventsByPriority={eventsByPriority}
        onToggleStep={handleToggleStep}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMoveEvent={handleMoveEvent}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        onUpdateStepStatus={handleUpdateStepStatus}
        onMoveStepUp={handleMoveStepUp}
        onMoveStepDown={handleMoveStepDown}
        onUpdateStepContent={handleUpdateStepContent}
        onUpdateStepTime={handleUpdateStepTime}
      />
    </div>
  );
}

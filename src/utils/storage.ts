import { Event, EventsState } from '../types';

const STORAGE_KEY = 'important-events-memo';
const DATA_VERSION = 1; // 数据版本号，当数据结构变化时递增

// 检查事件是否过期
const checkEventExpired = (event: Event): boolean => {
  if (!event.deadline) return false;
  const deadline = new Date(event.deadline);
  const now = new Date();
  return deadline < now && !event.completed;
};

// 数据迁移函数（当数据结构变化时使用）
const migrateData = (data: any, _version: number): EventsState => {
  // 当前版本为1，无需迁移
  // 未来如果数据结构变化，可以在这里添加迁移逻辑
  // 例如：if (version < 2) { ... 迁移逻辑 ... }
  return data;
};

export const loadEvents = (): Event[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      
      // 检查数据版本，如果版本不匹配则进行迁移
      const currentVersion = parsed.version || 0;
      if (currentVersion < DATA_VERSION) {
        const migrated = migrateData(parsed, currentVersion);
        migrated.version = DATA_VERSION;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        parsed.events = migrated.events;
      }
      
      // 更新过期状态
      parsed.events = (parsed.events || []).map((event: Event) => ({
        ...event,
        expired: checkEventExpired(event)
      }));
      return parsed.events;
    }
  } catch (error) {
    console.error('Failed to load events:', error);
    // 如果数据损坏，尝试备份后清除
    try {
      const backupKey = STORAGE_KEY + '_backup_' + Date.now();
      const corruptedData = localStorage.getItem(STORAGE_KEY);
      if (corruptedData) {
        localStorage.setItem(backupKey, corruptedData);
        console.warn('Corrupted data backed up to:', backupKey);
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch (backupError) {
      console.error('Failed to backup corrupted data:', backupError);
    }
  }
  return [];
};

export const saveEvents = (events: Event[]): void => {
  try {
    const state: EventsState = { 
      events,
      version: DATA_VERSION // 保存当前数据版本
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save events:', error);
    // 如果存储空间不足，提示用户
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('存储空间不足，请清除一些浏览器数据后重试。');
    }
  }
};

export const addEvent = (event: Event): void => {
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
};

export const updateEvent = (id: string, updates: Partial<Event>): void => {
  const events = loadEvents();
  const index = events.findIndex(e => e.id === id);
  if (index !== -1) {
    events[index] = { ...events[index], ...updates };
    saveEvents(events);
  }
};

export const deleteEvent = (id: string): void => {
  const events = loadEvents();
  const filtered = events.filter(e => e.id !== id);
  saveEvents(filtered);
};

export const moveEvent = (id: string, newPriority: number, newSortOrder: number): void => {
  const events = loadEvents();
  const index = events.findIndex(e => e.id === id);
  if (index !== -1) {
    events[index].priority = newPriority as 1 | 2 | 3 | 4;
    events[index].sortOrder = newSortOrder;
    saveEvents(events);
  }
};

// 事件排序函数（用于reorderEvents）
const sortEventsByOrder = (a: Event, b: Event): number => {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

export const reorderEvents = (id: string, direction: 'up' | 'down', priority: number): void => {
  const events = loadEvents();
  const samePriorityEvents = events
    .filter(e => e.priority === priority && !e.completed && !e.expired)
    .sort(sortEventsByOrder);
  
  const currentIndex = samePriorityEvents.findIndex(e => e.id === id);
  if (currentIndex === -1) return;
  
  // 交换sortOrder
  if (direction === 'up' && currentIndex > 0) {
    const temp = samePriorityEvents[currentIndex].sortOrder;
    samePriorityEvents[currentIndex].sortOrder = samePriorityEvents[currentIndex - 1].sortOrder;
    samePriorityEvents[currentIndex - 1].sortOrder = temp;
  } else if (direction === 'down' && currentIndex < samePriorityEvents.length - 1) {
    const temp = samePriorityEvents[currentIndex].sortOrder;
    samePriorityEvents[currentIndex].sortOrder = samePriorityEvents[currentIndex + 1].sortOrder;
    samePriorityEvents[currentIndex + 1].sortOrder = temp;
  }
  
  saveEvents(events);
};

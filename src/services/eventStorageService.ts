import { Event } from '../types';
import { StorageAdapter } from '../types/storage';
import { supabase } from '../lib/supabase';
import {
  addEvent as addLocalEvent,
  deleteEvent as deleteLocalEvent,
  deleteMultipleEvents as deleteLocalMultipleEvents,
  deleteAllCompletedEvents as deleteAllCompletedLocalEvents,
  loadAllEvents as loadAllLocalEvents,
  loadEvents as loadLocalEvents,
  reorderEvents as reorderLocalEvents,
  updateEvent as updateLocalEvent,
} from '../utils/storage';
import { getCurrentDeviceLabel } from '../utils/deviceInfo';

const PROVIDER = (import.meta.env.VITE_STORAGE_PROVIDER || 'local').toLowerCase();

const hasEditorAccess = async (): Promise<boolean> => {
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) return false;
    return Boolean(data.session?.user);
  }

  // 无 Supabase 时，默认允许写入本地存储
  return true;
};

const denyWrite = () => {
  alert('当前为只读模式，无法创建或修改事件。请使用编辑者账号登录。');
};

const checkEventExpired = (event: Event): boolean => {
  if (!event.deadline) return false;
  return new Date(event.deadline) < new Date() && !event.completed;
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  deadline: string | null;
  start_time: string | null;
  steps: Event['steps'] | null;
  completed: boolean;
  expired: boolean;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  updated_by_device?: string | null;
};

class LocalStorageAdapter implements StorageAdapter {
  async getEvents(): Promise<Event[]> {
    return loadLocalEvents();
  }

  async getAllEvents(): Promise<Event[]> {
    return loadAllLocalEvents();
  }

  async addEvent(event: Event): Promise<void> {
    addLocalEvent(event);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    updateLocalEvent(id, updates);
  }

  async deleteEvent(id: string): Promise<void> {
    deleteLocalEvent(id);
  }

  async deleteMultipleEvents(ids: string[]): Promise<void> {
    deleteLocalMultipleEvents(ids);
  }

  async reorderEvents(id: string, direction: 'up' | 'down', priority: number): Promise<void> {
    reorderLocalEvents(id, direction, priority);
  }
}

class SupabaseStorageAdapter implements StorageAdapter {
  private ensureClient() {
    if (!supabase) {
      throw new Error('Supabase 未初始化，请检查 .env.local 配置。');
    }
    return supabase;
  }

  private mapRowToEvent(row: EventRow): Event {
    const event: Event = {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      category: row.category as Event['category'],
      priority: row.priority as Event['priority'],
      deadline: row.deadline || undefined,
      startTime: row.start_time || undefined,
      steps: row.steps || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      updatedByDevice: row.updated_by_device || undefined,
      completed: row.completed,
      expired: row.expired,
      sortOrder: row.sort_order,
    };
    return {
      ...event,
      expired: checkEventExpired(event),
    };
  }

  private async getEditorUserId(): Promise<string> {
    const client = this.ensureClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      throw new Error('未登录编辑者账号');
    }
    return data.user.id;
  }

  async getEvents(): Promise<Event[]> {
    const client = this.ensureClient();
    const { data, error } = await client
      .from('events')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data || []) as EventRow[]).map((row) => this.mapRowToEvent(row));
  }

  async getAllEvents(): Promise<Event[]> {
    return this.getEvents();
  }

  async addEvent(event: Event): Promise<void> {
    const client = this.ensureClient();
    const userId = await this.getEditorUserId();
    const payload = {
      ...(isUuid(event.id) ? { id: event.id } : {}),
      user_id: userId,
      title: event.title,
      description: event.description || null,
      category: event.category,
      priority: event.priority,
      deadline: event.deadline || null,
      start_time: event.startTime || null,
      steps: event.steps || [],
      completed: event.completed,
      expired: checkEventExpired(event),
      sort_order: event.sortOrder,
      is_public: true,
      updated_at: event.updatedAt || event.createdAt,
      updated_by_device: event.updatedByDevice || null,
    };
    let { error } = await client.from('events').insert(payload);
    if (error && error.message.includes('updated_by_device')) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as Record<string, unknown>).updated_by_device;
      ({ error } = await client.from('events').insert(fallbackPayload));
    }
    if (error) {
      throw new Error(error.message);
    }
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<void> {
    const client = this.ensureClient();
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.deadline !== undefined) payload.deadline = updates.deadline ?? null;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime ?? null;
    if (updates.steps !== undefined) payload.steps = updates.steps;
    if (updates.completed !== undefined) payload.completed = updates.completed;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.updatedByDevice !== undefined) payload.updated_by_device = updates.updatedByDevice ?? null;
    payload.updated_at = new Date().toISOString();

    // 以最新状态为准重新计算过期字段
    const { data: currentRow, error: currentError } = await client
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (currentError) {
      throw new Error(currentError.message);
    }
    const merged: Event = this.mapRowToEvent(currentRow as EventRow);
    const mergedEvent: Event = {
      ...merged,
      ...updates,
    };
    payload.expired = checkEventExpired(mergedEvent);

    let { error } = await client.from('events').update(payload).eq('id', id);
    if (error && error.message.includes('updated_by_device')) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as Record<string, unknown>).updated_by_device;
      ({ error } = await client.from('events').update(fallbackPayload).eq('id', id));
    }
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteEvent(id: string): Promise<void> {
    const client = this.ensureClient();
    const { error } = await client.from('events').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteMultipleEvents(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const client = this.ensureClient();
    const { error } = await client.from('events').delete().in('id', ids);
    if (error) {
      throw new Error(error.message);
    }
  }

  async reorderEvents(id: string, direction: 'up' | 'down', priority: number): Promise<void> {
    const client = this.ensureClient();
    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('priority', priority)
      .eq('completed', false)
      .eq('expired', false)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const events = (data || []) as EventRow[];
    const currentIndex = events.findIndex((event) => event.id === id);
    if (currentIndex === -1 || events.length <= 1) return;

    if (direction === 'up' && currentIndex > 0) {
      [events[currentIndex], events[currentIndex - 1]] = [events[currentIndex - 1], events[currentIndex]];
    } else if (direction === 'down' && currentIndex < events.length - 1) {
      [events[currentIndex], events[currentIndex + 1]] = [events[currentIndex + 1], events[currentIndex]];
    } else {
      return;
    }

    for (let i = 0; i < events.length; i++) {
      const { error: updateError } = await client
        .from('events')
        .update({ sort_order: i })
        .eq('id', events[i].id);
      if (updateError) {
        throw new Error(updateError.message);
      }
    }
  }
}

const createAdapter = (): StorageAdapter => {
  if (PROVIDER === 'supabase') {
    return new SupabaseStorageAdapter();
  }
  return new LocalStorageAdapter();
};

const adapter = createAdapter();

export const loadEvents = async (): Promise<Event[]> => adapter.getEvents();
export const loadAllEvents = async (): Promise<Event[]> => adapter.getAllEvents();
export const getCompletedEventsCount = async (): Promise<number> => {
  const allEvents = await adapter.getAllEvents();
  return allEvents.filter((event) => event.completed).length;
};

export const addEvent = async (event: Event): Promise<boolean> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return false;
  }
  await adapter.addEvent({
    ...event,
    updatedByDevice: getCurrentDeviceLabel(),
  });
  return true;
};

export const updateEvent = async (id: string, updates: Partial<Event>): Promise<boolean> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return false;
  }
  await adapter.updateEvent(id, {
    ...updates,
    updatedByDevice: getCurrentDeviceLabel(),
  });
  return true;
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return false;
  }
  await adapter.deleteEvent(id);
  return true;
};

export const deleteMultipleEvents = async (ids: string[]): Promise<boolean> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return false;
  }
  await adapter.deleteMultipleEvents(ids);
  return true;
};

export const reorderEvents = async (id: string, direction: 'up' | 'down', priority: number): Promise<boolean> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return false;
  }
  await adapter.reorderEvents(id, direction, priority);
  return true;
};

export const deleteAllCompletedEvents = async (): Promise<number> => {
  if (!(await hasEditorAccess())) {
    denyWrite();
    return 0;
  }
  if (PROVIDER !== 'supabase') {
    return deleteAllCompletedLocalEvents();
  }
  const allEvents = await adapter.getAllEvents();
  const completedIds = allEvents.filter((event) => event.completed).map((event) => event.id);
  if (completedIds.length === 0) return 0;
  await adapter.deleteMultipleEvents(completedIds);
  return completedIds.length;
};

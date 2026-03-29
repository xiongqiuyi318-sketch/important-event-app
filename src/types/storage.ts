import { Event } from './index';

export type AccessMode = 'editor' | null;

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
}

export interface StorageAdapter {
  getEvents(): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
  addEvent(event: Event): Promise<void>;
  updateEvent(id: string, updates: Partial<Event>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  deleteMultipleEvents(ids: string[]): Promise<void>;
  reorderEvents(id: string, direction: 'up' | 'down', priority: number): Promise<void>;
}

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceUrl?: string;
  sourceTitle?: string;
  files: {
    path: string;
    content: string;
    confidence: 'high' | 'medium' | 'low';
    warnings?: string[];
  }[];
  versions?: {
    version: number;
    savedAt: number;
    filesCount: number;
  }[];
}

export interface BrowserHistoryRecord {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  engineUsed: string;
}

export interface BrowserBookmarkRecord {
  id: string;
  url: string;
  title: string;
  createdAt: number;
}

interface FitnaDBSchema extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { 'by-updated': number };
  };
  history: {
    key: string;
    value: BrowserHistoryRecord;
    indexes: { 'by-timestamp': number };
  };
  bookmarks: {
    key: string;
    value: BrowserBookmarkRecord;
    indexes: { 'by-created': number };
  };
}

let dbPromise: Promise<IDBPDatabase<FitnaDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<FitnaDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FitnaDBSchema>('al-fitna-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarkStore.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

// Project helpers
export async function saveProjectToDB(project: ProjectRecord): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function getProjectFromDB(id: string): Promise<ProjectRecord | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function getAllProjectsFromDB(): Promise<ProjectRecord[]> {
  const db = await getDB();
  const tx = db.transaction('projects', 'readonly');
  const index = tx.store.index('by-updated');
  const items: ProjectRecord[] = [];
  let cursor = await index.openCursor(null, 'prev');
  while (cursor) {
    items.push(cursor.value);
    cursor = await cursor.continue();
  }
  return items;
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

// History & Bookmark helpers
export async function addHistoryItem(item: Omit<BrowserHistoryRecord, 'id'>): Promise<void> {
  const db = await getDB();
  const id = 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  await db.put('history', { ...item, id });
}

export async function getAllHistory(): Promise<BrowserHistoryRecord[]> {
  const db = await getDB();
  const tx = db.transaction('history', 'readonly');
  const index = tx.store.index('by-timestamp');
  const items: BrowserHistoryRecord[] = [];
  let cursor = await index.openCursor(null, 'prev');
  let count = 0;
  while (cursor && count < 100) {
    items.push(cursor.value);
    count++;
    cursor = await cursor.continue();
  }
  return items;
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

export async function addBookmark(item: Omit<BrowserBookmarkRecord, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDB();
  const id = 'bm_' + Date.now();
  await db.put('bookmarks', { ...item, id, createdAt: Date.now() });
}

export async function getAllBookmarks(): Promise<BrowserBookmarkRecord[]> {
  const db = await getDB();
  const tx = db.transaction('bookmarks', 'readonly');
  const index = tx.store.index('by-created');
  const items: BrowserBookmarkRecord[] = [];
  let cursor = await index.openCursor(null, 'prev');
  while (cursor) {
    items.push(cursor.value);
    cursor = await cursor.continue();
  }
  return items;
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

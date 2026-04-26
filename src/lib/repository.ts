import { createSeedDb, STORAGE_DB_KEY, STORAGE_SESSION_KEY } from "./data";
import { supabaseEnabled } from "./supabase";
import type { AppDb } from "../types/domain";

export type AppRepository = {
  loadDb: () => Promise<AppDb>;
  saveDb: (db: AppDb) => Promise<void>;
  loadSession: () => Promise<string | null>;
  saveSession: (userId: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

const localRepository: AppRepository = {
  async loadDb() {
    const raw = localStorage.getItem(STORAGE_DB_KEY);
    if (raw) return JSON.parse(raw) as AppDb;
    const seed = createSeedDb();
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(seed));
    return seed;
  },
  async saveDb(db) {
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(db));
  },
  async loadSession() {
    return localStorage.getItem(STORAGE_SESSION_KEY);
  },
  async saveSession(userId) {
    localStorage.setItem(STORAGE_SESSION_KEY, userId);
  },
  async clearSession() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },
};

const supabaseRepository: AppRepository = {
  async loadDb() {
    return localRepository.loadDb();
  },
  async saveDb(db) {
    await localRepository.saveDb(db);
  },
  async loadSession() {
    return localRepository.loadSession();
  },
  async saveSession(userId) {
    await localRepository.saveSession(userId);
  },
  async clearSession() {
    await localRepository.clearSession();
  },
};

export const repository = supabaseEnabled ? supabaseRepository : localRepository;

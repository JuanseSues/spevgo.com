import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { repository } from "../lib/repository";
import type { AppDb } from "../types/domain";

export function useStore() {
  const qc = useQueryClient();
  const db = useQuery({ queryKey: ["db"], queryFn: repository.loadDb });
  const session = useQuery({ queryKey: ["session"], queryFn: repository.loadSession });

  const currentUser = useMemo(() => {
    if (!db.data || !session.data) return null;
    return db.data.users.find((u) => u.id === session.data) ?? null;
  }, [db.data, session.data]);

  const updateDb = async (updater: (d: AppDb) => AppDb) => {
    const current = await repository.loadDb();
    const next = updater(current);
    await repository.saveDb(next);
    await qc.invalidateQueries({ queryKey: ["db"] });
  };

  const setSession = async (userId: string) => {
    await repository.saveSession(userId);
    await qc.invalidateQueries({ queryKey: ["session"] });
  };

  const clearSession = async () => {
    await repository.clearSession();
    await qc.invalidateQueries({ queryKey: ["session"] });
  };

  return { db, currentUser, updateDb, setSession, clearSession, qc };
}

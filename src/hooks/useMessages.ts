import { liveQuery } from "dexie";
import { useObservable } from "react-use";
import { db } from "../db";

export function useMessages() {
  const messages = useObservable(
    liveQuery(() =>
      db.messages.orderBy("client_created_at").toArray()
    ),
    []
  );

  return messages ?? [];
}

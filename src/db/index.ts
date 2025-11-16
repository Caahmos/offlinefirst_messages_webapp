import Dexie from "dexie";
import type { Table } from "dexie";

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  client_created_at: string; // PRECISA estar no schema
  pending: 0 | 1;
}

export class AppDB extends Dexie {
  messages!: Table<Message>;

  constructor() {
    super("offline_messages_webapp");

    this.version(2).stores({
      messages: `
        id,
        created_at,
        client_created_at,
        pending
      `
    });
  }
}

export const db = new AppDB();

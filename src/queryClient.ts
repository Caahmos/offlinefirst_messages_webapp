import { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClient
} from "@tanstack/react-query-persist-client";
import localforage from "localforage";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

// Configura o IndexedDB via localforage
localforage.config({
  name: "offline_messages_webapp",
  storeName: "react_query_cache",
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 24 * 60 * 60 * 1000, // 24h
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});

// Persister manual (modelo recomendado no TanStack v5)
const persister = {
  persistClient: async (client: PersistedClient) => {
    await localforage.setItem("rq-cache", client);
  },
  restoreClient: async () => {
    return (await localforage.getItem("rq-cache")) as PersistedClient | undefined;
  },
  removeClient: async () => {
    await localforage.removeItem("rq-cache");
  },
};

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // cache expira em 24h
});

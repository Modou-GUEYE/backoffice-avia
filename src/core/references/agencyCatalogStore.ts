import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AgencyCatalogItem {
  id: string;
  nom: string;
}

interface AgencyCatalogState {
  items: AgencyCatalogItem[];
  mergeFromList: (items: AgencyCatalogItem[]) => void;
  upsert: (item: AgencyCatalogItem) => void;
}

const normalize = (value: string) => value.trim().toLowerCase();

export const useAgencyCatalogStore = create<AgencyCatalogState>()(
  persist(
    (set) => ({
      items: [],
      mergeFromList: (incomingItems) => {
        set((state) => {
          const map = new Map<string, AgencyCatalogItem>();

          state.items.forEach((item) => {
            map.set(normalize(item.nom), item);
          });

          incomingItems.forEach((item) => {
            const key = normalize(item.nom);
            if (!key) return;
            map.set(key, { id: item.id, nom: item.nom.trim() });
          });

          return { items: Array.from(map.values()) };
        });
      },
      upsert: (item) => {
        set((state) => {
          const key = normalize(item.nom);
          if (!key) return state;

          const existingIndex = state.items.findIndex((current) => normalize(current.nom) === key);
          const nextItem = { id: item.id, nom: item.nom.trim() };

          if (existingIndex === -1) {
            return { items: [nextItem, ...state.items] };
          }

          const updatedItems = [...state.items];
          updatedItems[existingIndex] = nextItem;
          return { items: updatedItems };
        });
      },
    }),
    {
      name: "avia_agency_catalog",
    },
  ),
);

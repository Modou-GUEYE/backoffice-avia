import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StructureCatalogItem {
  id: string;
  nom: string;
}

interface StructureCatalogState {
  items: StructureCatalogItem[];
  mergeFromList: (items: StructureCatalogItem[]) => void;
  replaceFromList: (items: StructureCatalogItem[]) => void;
  upsert: (item: StructureCatalogItem) => void;
}

const normalize = (value: string) => value.trim().toLowerCase();

export const useStructureCatalogStore = create<StructureCatalogState>()(
  persist(
    (set) => ({
      items: [],
      mergeFromList: (incomingItems) => {
        set((state) => {
          const map = new Map<string, StructureCatalogItem>();

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
      replaceFromList: (incomingItems) => {
        set(() => {
          const map = new Map<string, StructureCatalogItem>();

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
      name: "avia_structure_catalog",
    },
  ),
);

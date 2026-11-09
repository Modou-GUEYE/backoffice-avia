import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StructureUser } from "@/features/structures/models/types";

export interface StructureUsersRegistryItem {
  structureId: string;
  structureCode: string;
  structureName: string;
  users: StructureUser[];
}

interface StructureUsersRegistryState {
  items: StructureUsersRegistryItem[];
  upsertForStructure: (item: StructureUsersRegistryItem) => void;
  removeForStructure: (structureId: string) => void;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const useStructureUsersStore = create<StructureUsersRegistryState>()(
  persist(
    (set) => ({
      items: [],
      upsertForStructure: (incomingItem) => {
        set((state) => {
          const nextItem: StructureUsersRegistryItem = {
            structureId: incomingItem.structureId,
            structureCode: incomingItem.structureCode,
            structureName: incomingItem.structureName,
            users: incomingItem.users,
          };

          const existingIndex = state.items.findIndex((item) => {
            return (
              item.structureId === incomingItem.structureId
              || normalize(item.structureCode) === normalize(incomingItem.structureCode)
              || normalize(item.structureName) === normalize(incomingItem.structureName)
            );
          });

          if (existingIndex === -1) {
            return { items: [nextItem, ...state.items] };
          }

          const updatedItems = [...state.items];
          updatedItems[existingIndex] = nextItem;
          return { items: updatedItems };
        });
      },
      removeForStructure: (structureId) => {
        set((state) => ({
          items: state.items.filter((item) => item.structureId !== structureId),
        }));
      },
    }),
    {
      name: "avia_structure_users_registry",
    },
  ),
);

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActorRole, EntityContext } from "@/core/permissions/permissions";
import { StructureUser } from "@/features/structures/models/types";

export interface LocalSeedUser {
  id: string;
  nomComplet: string;
  email: string;
  password: string;
  role: ActorRole;
  entityContext: EntityContext;
  isActive: boolean;
}

interface LocalUsersState {
  users: LocalSeedUser[];
  authenticate: (email: string, password: string) => LocalSeedUser | null;
  mergeStructureUsers: (structureUsers: StructureUser[]) => void;
}

const usersSeed: LocalSeedUser[] = [];

const seedUsersById = new Map(usersSeed.map((user) => [user.id, user]));

const applySeedDefaults = (users: LocalSeedUser[]): LocalSeedUser[] =>
  users.map((user) => {
    const seed = seedUsersById.get(user.id);
    if (!seed) {
      return user;
    }

    return {
      ...user,
      nomComplet: seed.nomComplet,
      email: seed.email,
      password: seed.password,
      role: seed.role,
      entityContext: seed.entityContext,
      isActive: seed.isActive,
    };
  });

const normalize = (value: string) => value.trim().toLowerCase();

export const useLocalUsersStore = create<LocalUsersState>()(
  persist(
    (set, get) => ({
      users: usersSeed,
      authenticate: (email, password) => {
        const normalizedEmail = normalize(email);
        const normalizedPassword = password.trim();

        const user = get().users.find(
          (candidate) =>
            candidate.isActive &&
            normalize(candidate.email) === normalizedEmail &&
            candidate.password === normalizedPassword,
        );

        return user ?? null;
      },
      mergeStructureUsers: (structureUsers) => {
        set((state) => {
          if (!structureUsers.length) {
            return state;
          }

          const nextUsers = [...state.users];

          structureUsers.forEach((structureUser) => {
            const fullName = `${structureUser.prenom} ${structureUser.nom}`.trim();
            const normalizedFullName = normalize(fullName);

            const existingIndex = nextUsers.findIndex((user) => {
              const byId = user.id === structureUser.id;
              const byName = normalize(user.nomComplet) === normalizedFullName;
              return byId || byName;
            });

            if (existingIndex >= 0) {
              const existingUser = nextUsers[existingIndex];
              const seedUser = seedUsersById.get(existingUser.id);

              nextUsers[existingIndex] = {
                ...existingUser,
                id: structureUser.id || existingUser.id,
                nomComplet: seedUser?.nomComplet || fullName || existingUser.nomComplet,
                role: seedUser?.role || existingUser.role,
                entityContext: seedUser?.entityContext || "Structure",
                isActive: true,
              };
              return;
            }

            nextUsers.push({
              id: structureUser.id,
              nomComplet: fullName,
              email: "",
              password: "",
              role: "Agent",
              entityContext: "Structure",
              isActive: true,
            });
          });

          return { users: nextUsers };
        });
      },
    }),
    {
      name: "avia_local_users_store",
      merge: (persistedState, currentState) => {
        const state = (persistedState ?? {}) as Partial<LocalUsersState>;

        return {
          ...currentState,
          ...state,
          users: applySeedDefaults(
            Array.isArray(state.users) ? state.users : currentState.users,
          ),
        };
      },
    },
  ),
);

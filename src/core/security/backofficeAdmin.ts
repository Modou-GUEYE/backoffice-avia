/** Administrateur back-office : rôle Administrateur de l'Administration ou profil administrateur global. */
export const isBackofficeAdminActor = (
  role: string | undefined,
  entityContext: string | undefined,
  permissions: string[] | null | undefined,
): boolean =>
  (role === "Administrateur" && entityContext === "Administration") ||
  Boolean(
    permissions?.some((p) => {
      const lower = p.toLowerCase();
      return p === "*" || p === "all" || lower.includes("bo-admin") || lower.includes("bo.admin");
    }),
  );

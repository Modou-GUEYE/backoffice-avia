import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/core/theme/ThemeContext";
import { useAuthStore, parseEntityContextFromToken, extractTokenPermissions, hasBackofficeAccess } from "@/core/security/authStore";
import { ActorRole, EntityContext } from "@/core/permissions/permissions";
import {
  AccessSecurityRequestError,
  loginWithAccessSecurity,
} from "@/core/security/accessSecurityService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

const PROFILE_ACTOR_MAP: Array<{
  test: (role: string) => boolean;
  actor: { role: ActorRole; entityContext: EntityContext };
}> = [
    {
      test: (role) => role === "profile.bo-admin",
      actor: { role: "Administrateur", entityContext: "Administration" },
    },
    {
      test: (role) => role === "profile.bo-controller",
      actor: { role: "Contrôleur", entityContext: "Administration" },
    },
    {
      test: (role) => role === "profile.bo-profil-technique",
      actor: { role: "Profil Technique", entityContext: "Administration" },
    },
    {
      test: (role) => role === "profile.bo.structure-admin",
      actor: { role: "Administrateur", entityContext: "Structure" },
    },
    {
      test: (role) => role === "profile.bo.structure-controller",
      actor: { role: "Contrôleur", entityContext: "Structure" },
    },
    {
      test: (role) => role === "profile.bo.structure-agent-fin",
      actor: { role: "Initiateur financier", entityContext: "Structure" },
    },
    {
      test: (role) => role === "profile.bo.structure-superviseur-fin",
      actor: { role: "Validateur financier", entityContext: "Structure" },
    },
    {
      test: (role) => role === "profile.bo.agence-agent",
      actor: { role: "Agent", entityContext: "Agence" },
    },
    {
      test: (role) => role === "profile.bo.agence-superviseur",
      actor: { role: "Superviseur", entityContext: "Agence" },
    },
    {
      test: (role) => role === "profile.bo.autonome-set-admin",
      actor: { role: "Administrateur", entityContext: "Distributeur" },
    },
    {
      test: (role) => role === "profile.bo.autonome-set-agent",
      actor: { role: "Agent", entityContext: "Distributeur" },
    },
    {
      test: (role) => role === "profile.bo.autonome-set-superviseur",
      actor: { role: "Superviseur", entityContext: "Distributeur" },
    },
    {
      test: (role) => role === "profile.bo.produit-central",
      actor: { role: "Profil central", entityContext: "Produit" },
    },
    {
      test: (role) => role === "profile.bo.partenaire-admin" || role === "profile.bo-partenaire-admin",
      actor: { role: "Administrateur", entityContext: "Partenaire" },
    },
    {
      test: (role) => role === "profile.bo.partenaire-facturier" || role === "profile.bo-partenaire-facturier",
      actor: { role: "Agent", entityContext: "Partenaire" },
    },
    {
      test: (role) => role === "profile.bo.partenaire-marchand" || role === "profile.bo-partenaire-marchand",
      actor: { role: "Agent", entityContext: "Partenaire" },
    },
  ];

const normalizeBackendRole = (role: string): string => role.trim().toLowerCase();

const ENTITY_CONTEXT_MATCHERS: Array<{
  matches: (role: string) => boolean;
  entityContext: EntityContext;
}> = [
    {
      matches: (role) =>
        role.includes("profile.bo-admin") ||
        role.includes("profile.bo-controller") ||
        role.includes("profile.bo-profil-technique"),
      entityContext: "Administration",
    },
    {
      matches: (role) =>
        role.includes("profile.bo.partenaire-") ||
        role.includes("profile.bo-partenaire-") ||
        role.includes("partenaire"),
      entityContext: "Partenaire",
    },
    {
      matches: (role) =>
        role.includes("profile.bo.structure-") ||
        role.includes("enrollment") ||
        role.includes("structure-admin"),
      entityContext: "Structure",
    },
    {
      matches: (role) => role.includes("caisse"),
      entityContext: "Caisse",
    },
    {
      matches: (role) => role.includes("agence"),
      entityContext: "Agence",
    },
    {
      matches: (role) => role.includes("profile.bo.autonome-set-") || role.includes("autonome-set"),
      entityContext: "Distributeur",
    },
    {
      matches: (role) => role.includes("profile.bo.produit-") || role.includes("produit"),
      entityContext: "Produit",
    },
    {
      matches: (role) => role.includes("user"),
      entityContext: "Utilisateurs",
    },
  ];

const deriveEntityContextFromPermissions = (permissions: string[]): EntityContext | null => {
  for (const perm of permissions) {
    const lowerPerm = perm.toLowerCase();
    const match = ENTITY_CONTEXT_MATCHERS.find((candidate) => candidate.matches(lowerPerm));
    if (match) {
      return match.entityContext;
    }
  }
  return null;
};

const CONTEXT_PRIORITY: Record<EntityContext, number> = {
  Administration: 0,
  Partenaire: 1,
  Distributeur: 2,
  Structure: 3,
  Agence: 4,
  Caisse: 5,
  Produit: 6,
  Utilisateurs: 7,
};

export const deriveActorFromBackendRoles = (
  backendRoles: string[]
): { role: ActorRole; entityContext: EntityContext } | null => {
  if (!backendRoles || backendRoles.length === 0) {
    return null;
  }

  const matchedActors = backendRoles
    .map((rawRole) => {
      const normalizedRole = normalizeBackendRole(rawRole);
      return PROFILE_ACTOR_MAP.find((candidate) => candidate.test(normalizedRole));
    })
    .filter((candidate): candidate is { test: (role: string) => boolean; actor: { role: ActorRole; entityContext: EntityContext } } => Boolean(candidate));

  if (matchedActors.length > 0) {
    const bestActor = matchedActors
      .map((candidate) => candidate.actor)
      .sort((left, right) => CONTEXT_PRIORITY[left.entityContext] - CONTEXT_PRIORITY[right.entityContext])[0];

    return bestActor;
  }

  const entityFromPermissions = deriveEntityContextFromPermissions(backendRoles);
  if (entityFromPermissions) {
    return { role: "Administrateur", entityContext: entityFromPermissions };
  }

  return null;
};

const deriveBackendPermissions = (profiles: string[], accessToken: string): string[] => {
  const normalizedProfiles = profiles
    .filter((profile): profile is string => typeof profile === "string")
    .map((profile) => profile.trim())
    .filter(Boolean);

  const tokenRoles = extractTokenPermissions(accessToken);

  if (normalizedProfiles.length > 0) {
    return Array.from(new Set([...normalizedProfiles, ...tokenRoles]));
  }

  return tokenRoles;
};

export interface AuthErrorInfo {
  title?: string;
  message: string;
}

export type LoginField = "identifier" | "password";

const LOGIN_USERNAME_PATTERN = /^[a-z0-9._-]{3,}$/i;

/** Valide les identifiants de connexion et renvoie toutes les erreurs, par champ. */
export const validateLoginCredentials = (identifier: string, password: string): FieldErrors<LoginField> => {
  const errors: FieldErrors<LoginField> = {};
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedIdentifier) errors.identifier = "L'identifiant est obligatoire.";
  else if (!LOGIN_USERNAME_PATTERN.test(normalizedIdentifier)) {
    errors.identifier = "Le nom d'utilisateur ne doit contenir que des lettres, chiffres, tirets ou points.";
  }

  if (!normalizedPassword) errors.password = "Le mot de passe est obligatoire.";
  else if (normalizedPassword.length < 6) errors.password = "Le mot de passe doit comporter au moins 6 caractères.";

  return errors;
};

export const useAuth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { branding } = useTheme();
  const login = useAuthStore((state) => state.login);
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clearError: clearFieldError,
  } = useFieldErrors<LoginField>();

  const clearError = () => setError(null);

  const validateCredentials = () => {
    const errors = validateLoginCredentials(email, password);
    setFieldErrors(errors);
    setError(null);
    if (hasFieldErrors(errors)) {
      return null;
    }

    return {
      normalizedIdentifier: email.trim().toLowerCase(),
      normalizedPassword: password.trim(),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const validated = validateCredentials();
    if (!validated) {
      return;
    }

    setLoading(true);

    try {
      const loginResponse = await loginWithAccessSecurity({
        username: validated.normalizedIdentifier,
        password: validated.normalizedPassword,
      });

      // Vérifier que le token appartient bien à un utilisateur du backoffice
      if (!hasBackofficeAccess(loginResponse.access_token)) {
        setError({
          title: "Accès non autorisé",
          message: "Ce compte est associé à l'application mobile et ne permet pas d'accéder au backoffice.",
        });
        setLoading(false);
        return;
      }

      const backendPerms = deriveBackendPermissions(loginResponse.profiles, loginResponse.access_token);
      const actor = deriveActorFromBackendRoles(backendPerms);

      if (!actor) {
        setError({
          title: "Profil non autorisé",
          message: "Aucun profil d'administration n'est associé à ce compte.",
        });
        setLoading(false);
        return;
      }

      const tokenContext = parseEntityContextFromToken(loginResponse.access_token);
      const effectiveEntityContext = actor.entityContext ?? tokenContext;

      login({
        email: validated.normalizedIdentifier,
        token: loginResponse.access_token,
        refreshToken: loginResponse.refresh_token,
        role: actor.role,
        entityContext: effectiveEntityContext,
        permissions: backendPerms,
      });

      navigate("/dashboard");
    } catch (submitError) {
      if (submitError instanceof AccessSecurityRequestError) {
        if (submitError.requiresPasswordReset) {
          const searchParams = new URLSearchParams({
            username: validated.normalizedIdentifier,
            reset_token: validated.normalizedPassword,
          });
          navigate(`/set-password?${searchParams.toString()}`, { replace: true });
          return;
        }

        setError({
          title: submitError.title,
          message: submitError.message,
        });
        return;
      }

      setError({
        title: "Échec de connexion",
        message: submitError instanceof Error ? submitError.message : "Erreur lors de la connexion",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    error,
    clearError,
    fieldErrors,
    clearFieldError,
    showPassword, setShowPassword,
    loading,
    branding,
    handleSubmit,
  };
};

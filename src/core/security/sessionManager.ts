import { useAuthStore } from "./authStore";

const SESSION_EXPIRED_KEY = "avia_session_expired_msg";

/**
 * Enregistre un message d'expiration de session, déconnecte l'utilisateur localement
 * et redirige vers la page de login.
 */
export const notifySessionExpired = (
  message = "Votre session a expiré. Veuillez vous reconnecter pour continuer."
): void => {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, message);
  } catch {
    // Ignore storage quota or access errors
  }

  useAuthStore.getState().logout();

  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.href = "/?expired=true";
  }
};

/**
 * Récupère et consomme le message d'expiration de session s'il existe (sessionStorage ou URL).
 */
export const consumeSessionExpiredMessage = (): string | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (stored) {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return stored;
    }
  } catch {
    // Ignore storage errors
  }

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "true") {
      params.delete("expired");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      return "Votre session a expiré. Veuillez vous reconnecter pour continuer.";
    }
  }

  return null;
};

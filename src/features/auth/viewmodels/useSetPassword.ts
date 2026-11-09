import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { validateAccessSecurityPasswordSet } from "@/core/security/accessSecurityService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

export type SetPasswordField = "username" | "resetToken" | "newPassword" | "confirmPassword";

export interface SetPasswordFormValues {
  username: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

/** Valide le formulaire de définition du mot de passe et renvoie toutes les erreurs, par champ. */
export const validateSetPasswordForm = (values: SetPasswordFormValues): FieldErrors<SetPasswordField> => {
  const errors: FieldErrors<SetPasswordField> = {};

  if (!values.username.trim()) errors.username = "Le username est obligatoire.";
  if (!values.resetToken.trim()) errors.resetToken = "Le mot de passe temporaire est obligatoire.";

  if (!values.newPassword.trim()) errors.newPassword = "Le nouveau mot de passe est obligatoire.";
  else if (values.newPassword.length < 8) {
    errors.newPassword = "Le nouveau mot de passe doit contenir au moins 8 caracteres.";
  }

  if (!values.confirmPassword) errors.confirmPassword = "La confirmation du mot de passe est obligatoire.";
  else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "La confirmation du mot de passe ne correspond pas.";
  }

  return errors;
};

export const useSetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const usernameFromQuery = (searchParams.get("username") ?? searchParams.get("email") ?? "").trim();
  const tokenFromQuery = (searchParams.get("reset_token") ?? searchParams.get("token") ?? "").trim();

  const [username, setUsername] = useState(usernameFromQuery);
  const [resetToken, setResetToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clearError: clearFieldError,
  } = useFieldErrors<SetPasswordField>();

  const canEditIdentifiers = useMemo(() => !usernameFromQuery || !tokenFromQuery, [usernameFromQuery, tokenFromQuery]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const validationErrors = validateSetPasswordForm({ username, resetToken, newPassword, confirmPassword });
    setFieldErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) {
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await validateAccessSecurityPasswordSet({
        username: username.trim(),
        reset_token: resetToken.trim(),
        new_password: newPassword,
      });
      setSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : "Impossible de definir le nouveau mot de passe";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Redirection automatique vers le login après succès
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [submitted, navigate]);

  const goToLogin = () => {
    navigate("/", { replace: true });
  };

  return {
    username,
    setUsername,
    resetToken,
    setResetToken,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    submitted,
    loading,
    error,
    fieldErrors,
    clearFieldError,
    canEditIdentifiers,
    handleSubmit,
    goToLogin,
  };
};

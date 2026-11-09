import { useMemo, useState } from "react";
import { requestAccessSecurityPasswordReset } from "@/core/security/accessSecurityService";
import { FieldErrors, hasFieldErrors, useFieldErrors } from "@/shared/forms/fieldErrors";

const isValidEmail = (value: string): boolean => {
  const [localPart, domainPart, ...extraParts] = value.split("@");
  return Boolean(
    localPart &&
    domainPart &&
    extraParts.length === 0 &&
    !localPart.includes(" ") &&
    domainPart.includes(".") &&
    !domainPart.startsWith(".") &&
    !domainPart.endsWith("."),
  );
};

export type ForgotPasswordField = "email";

/** Valide l'adresse e-mail de la demande de réinitialisation et renvoie les erreurs, par champ. */
export const validateForgotPasswordForm = (email: string): FieldErrors<ForgotPasswordField> => {
  const errors: FieldErrors<ForgotPasswordField> = {};
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) errors.email = "Veuillez renseigner votre adresse e-mail.";
  else if (!isValidEmail(normalizedEmail)) errors.email = "Veuillez saisir une adresse e-mail valide.";

  return errors;
};

export const useForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clearError: clearFieldError,
  } = useFieldErrors<ForgotPasswordField>();

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validateEmail = () => {
    const errors = validateForgotPasswordForm(email);
    setFieldErrors(errors);
    setError(null);
    return !hasFieldErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!validateEmail()) {
      return;
    }

    setLoading(true);
    try {
      await requestAccessSecurityPasswordReset(normalizedEmail);
      setSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : "Impossible d'envoyer la demande de reinitialisation";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    normalizedEmail,
    submitted,
    loading,
    error,
    fieldErrors,
    clearFieldError,
    handleSubmit,
  };
};

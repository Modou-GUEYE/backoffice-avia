import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/** Erreurs de validation par champ : clé du champ → message affiché sous le champ. */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** Classes appliquées à un champ invalide (bordure et focus en rouge). */
export const INVALID_FIELD_CLASS = "border-destructive focus-visible:ring-destructive focus:ring-destructive";

/** Props à poser sur un champ (Input, SelectTrigger, Textarea, bouton de combobox…) selon son erreur. */
export const invalidFieldProps = (error: string | undefined, className?: string) => ({
  "aria-invalid": error ? true : undefined,
  className: cn(className, error && INVALID_FIELD_CLASS),
});

/** Message d'erreur affiché sous un champ ; rien si le champ est valide. */
export const FieldError: React.FC<{ message?: string; className?: string }> = ({ message, className }) =>
  message ? (
    <p role="alert" className={cn("text-xs font-medium text-destructive", className)}>
      {message}
    </p>
  ) : null;

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const hasFieldErrors = (errors: FieldErrors): boolean => Object.values(errors).some(Boolean);

/** État des erreurs par champ d'un formulaire, effacées champ par champ quand l'utilisateur corrige. */
export const useFieldErrors = <K extends string>() => {
  const [errors, setErrors] = useState<FieldErrors<K>>({});

  const clearError = useCallback((field: K) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetErrors = useCallback(() => setErrors({}), []);

  return { errors, setErrors, clearError, resetErrors };
};

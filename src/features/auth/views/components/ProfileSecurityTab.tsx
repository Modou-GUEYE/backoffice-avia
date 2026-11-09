import React, { useState, useMemo } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  Lock,
  Save,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, parseUserInfoFromToken, parseJwtPayload } from "@/core/security/authStore";
import { changeAccessSecurityPassword } from "@/core/security/accessSecurityService";
import { FieldError, hasFieldErrors, invalidFieldProps, useFieldErrors } from "@/shared/forms/fieldErrors";
import {
  PasswordChangeField,
  getPasswordCriteria,
  validatePasswordChangeForm,
} from "../../viewmodels/passwordChangeValidation";

export const ProfileSecurityTab: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors<PasswordChangeField>();

  const rawPayload = useMemo(() => parseJwtPayload<{ sub?: string }>(token), [token]);
  const tokenUser = parseUserInfoFromToken(token ?? undefined);
  const userId = user?.userId ?? tokenUser.userId ?? rawPayload?.sub ?? "";

  const criteria = useMemo(() => getPasswordCriteria(newPassword), [newPassword]);

  const metCount = criteria.filter((c) => c.met).length;
  const strengthPercentage = newPassword.length > 0 ? (metCount / criteria.length) * 100 : 0;

  const strengthConfig = useMemo(() => {
    if (strengthPercentage <= 25) {
      return { label: "Très faible", barColor: "bg-destructive", badgeBg: "bg-destructive/10 text-destructive border-destructive/20" };
    }
    if (strengthPercentage <= 50) {
      return { label: "Moyen", barColor: "bg-amber-500", badgeBg: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    }
    if (strengthPercentage <= 75) {
      return { label: "Bon", barColor: "bg-accent", badgeBg: "bg-accent/10 text-accent border-accent/20" };
    }
    return { label: "Fort & Sécurisé", barColor: "bg-emerald-500", badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  }, [strengthPercentage]);

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const validationErrors = validatePasswordChangeForm({ currentPassword, newPassword, confirmPassword });
    setErrors(validationErrors);
    if (hasFieldErrors(validationErrors)) return;

    if (!userId) {
      toast.error("Identifiant utilisateur introuvable dans le token de session");
      return;
    }

    setIsSaving(true);
    try {
      const response = await changeAccessSecurityPassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      const successMessage =
        response?.message?.toLowerCase().includes("password changed") || response?.message === "Password changed"
          ? "Votre mot de passe a été modifié avec succès."
          : response?.message || "Votre mot de passe a été modifié avec succès.";
      toast.success(successMessage);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      resetErrors();
    } catch (error) {
      const rawError = error instanceof Error ? error.message : "Impossible de modifier le mot de passe";
      const userFriendlyError =
        rawError.toLowerCase().includes("invalid") || rawError.toLowerCase().includes("current")
          ? "Le mot de passe actuel est incorrect. Veuillez vérifier votre saisie."
          : rawError;
      toast.error(userFriendlyError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Formulaire de modification */}
      <Card className="lg:col-span-7 rounded-xl border border-border/60 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">Modifier le mot de passe</CardTitle>
              <CardDescription className="text-xs">
                Saisissez votre mot de passe actuel puis définissez un nouveau mot de passe fort.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Mot de passe actuel */}
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-semibold text-foreground">
                Mot de passe actuel
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    clearError("currentPassword");
                  }}
                  placeholder="••••••••••••"
                  {...invalidFieldProps(errors.currentPassword, "pl-9 pr-10 text-sm bg-background/80 h-10")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.currentPassword} />
            </div>

            <Separator className="my-2 border-dashed" />

            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                  Nouveau mot de passe
                </Label>
                {newPassword && (
                  <Badge variant="outline" className={`text-[10px] font-medium px-2 ${strengthConfig.badgeBg}`}>
                    {strengthConfig.label}
                  </Badge>
                )}
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    clearError("newPassword");
                  }}
                  placeholder="Saisissez le nouveau mot de passe"
                  {...invalidFieldProps(errors.newPassword, "pl-9 pr-10 text-sm bg-background/80 h-10")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.newPassword} />

              {/* Jauge de force */}
              {newPassword.length > 0 && (
                <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthConfig.barColor}`}
                      style={{ width: `${strengthPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearError("confirmPassword");
                  }}
                  placeholder="Répétez le nouveau mot de passe"
                  {...invalidFieldProps(
                    errors.confirmPassword,
                    `pl-9 pr-10 text-sm bg-background/80 h-10 ${
                      passwordsMatch ? "border-emerald-500/50 focus-visible:ring-emerald-500/30" : ""
                    }`,
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <FieldError message={errors.confirmPassword} />
              {!errors.confirmPassword && confirmPassword.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 mt-1 ${passwordsMatch ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive"}`}>
                  {passwordsMatch ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Les mots de passe sont identiques
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" />
                      Les mots de passe ne correspondent pas
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="gradient-accent text-accent-foreground hover:opacity-90 text-xs h-10 px-5 gap-2 font-medium"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Modification..." : "Modifier le mot de passe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Exigences de sécurité */}
      <Card className="lg:col-span-5 rounded-xl border border-border/60 bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm font-bold text-foreground">Exigences de sécurité</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Votre mot de passe doit respecter l'ensemble des critères ci-dessous pour être validé.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2.5">
            {criteria.map((c, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs transition-all ${
                  c.met
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium"
                    : "bg-secondary/40 border-border/30 text-muted-foreground"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    c.met ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.met ? <Check className="h-3 w-3" /> : "•"}
                </div>
                <span className="leading-tight">{c.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

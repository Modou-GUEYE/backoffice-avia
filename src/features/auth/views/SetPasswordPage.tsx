import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { motion } from "framer-motion";
import { CheckCircle, Eye, EyeOff, KeyRound, Lock, User } from "lucide-react";
import { useSetPassword } from "../viewmodels/useSetPassword";
import { AuthSideBanner } from "./components";

const SetPasswordPage = () => {
  const {
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
  } = useSetPassword();

  return (
    <div className="flex min-h-screen">
      <AuthSideBanner
        title={
          <>
            Première connexion<br /><span className="text-white/90">Nouveau mot de passe</span>
          </>
        }
        subtitle="Définissez votre mot de passe définitif pour activer votre compte."
      />

      <div className="relative flex-1 flex items-center justify-center p-8 bg-background">
        {loading && <LoadingOverlay title="Modification en cours" description="Veuillez patienter pendant la mise à jour du mot de passe..." />}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Mot de passe mis à jour</h2>
                <p className="text-muted-foreground">
                  Votre compte est activé. Vous allez être redirigé vers la page de connexion dans quelques secondes…
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Definir un nouveau mot de passe</h2>
                <p className="text-muted-foreground mt-1">Renseignez les informations recues par email pour finaliser votre premiere connexion.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      {...invalidFieldProps(fieldErrors.username, "pl-10")}
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        clearFieldError("username");
                      }}
                      placeholder="username"
                      disabled={!canEditIdentifiers}
                      required
                    />
                  </div>
                  <FieldError message={fieldErrors.username} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-token">Mot de passe temporaire</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-token"
                      type="text"
                      {...invalidFieldProps(fieldErrors.resetToken, "pl-10")}
                      value={resetToken}
                      onChange={(event) => {
                        setResetToken(event.target.value);
                        clearFieldError("resetToken");
                      }}
                      placeholder="Mot de passe temporaire"
                      disabled={!canEditIdentifiers}
                      required
                    />
                  </div>
                  <FieldError message={fieldErrors.resetToken} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      {...invalidFieldProps(fieldErrors.newPassword, "pl-10 pr-10")}
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        clearFieldError("newPassword");
                      }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.newPassword} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      {...invalidFieldProps(fieldErrors.confirmPassword, "pl-10 pr-10")}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        clearFieldError("confirmPassword");
                      }}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.confirmPassword} />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 font-semibold" disabled={loading}>
                  Definir le mot de passe
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SetPasswordPage;

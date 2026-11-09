import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, ShieldAlert, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { consumeSessionExpiredMessage } from "@/core/security/sessionManager";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import aviaLogo from "@/assets/logo_AVIA.png";
import { useAuth } from "../viewmodels/useAuth";
import { AuthSideBanner } from "./components";

const LoginPage = () => {
  const {
    email, setEmail, password, setPassword,
    error, clearError, fieldErrors, clearFieldError,
    showPassword, setShowPassword, loading,
    branding, handleSubmit,
  } = useAuth();

  useEffect(() => {
    const expiredReason = consumeSessionExpiredMessage();
    if (expiredReason) {
      toast.error(expiredReason, {
        description: "Votre session a été fermée pour des raisons de sécurité.",
        duration: 5000,
      });
    }
  }, []);

  const logoUrl = branding.logoUrl || aviaLogo;

  return (
    <div className="flex min-h-screen">
      {/* Left - Branding Banner */}
      <AuthSideBanner
        branding={branding}
        title={
          <>
            {branding.tagline || "Plateforme de gestion"}
            <br />
            <span className="text-white/90">centralisée</span>
          </>
        }
        subtitle="Gérez vos structures, produits, agences et utilisateurs depuis une interface unique et sécurisée."
      />

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logoUrl} alt={branding.entityName} className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-xl font-bold text-foreground tracking-tight">{branding.entityName || "AVIA V2"}</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
            <p className="text-muted-foreground mt-1">Entrez vos identifiants pour accéder à votre espace</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifiant</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Nom d'utilisateur"
                  {...invalidFieldProps(fieldErrors.identifier, "pl-10")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("identifier");
                    if (error) clearError();
                  }}
                  required
                />
              </div>
              <FieldError message={fieldErrors.identifier} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...invalidFieldProps(fieldErrors.password, "pl-10 pr-10")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                    if (error) clearError();
                  }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="rounded-xl border border-destructive/25 bg-destructive/[0.04] p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-destructive/15">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
                      {error.title && (
                        <h4 className="text-sm font-semibold text-foreground tracking-tight">
                          {error.title}
                        </h4>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {error.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-1">
                <Link to="/forgot-password" className="text-sm text-accent hover:underline font-medium">Mot de passe oublié ?</Link>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              Se connecter
            </Button>
          </form>
        </motion.div>
      </div>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full"
            />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Connexion en cours...
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LoginPage;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/core/theme/ThemeContext";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { FieldError, invalidFieldProps } from "@/shared/forms/fieldErrors";
import { useForgotPassword } from "../viewmodels/useForgotPassword";
import { AuthSideBanner } from "./components";

const ForgotPasswordPage = () => {
  const { branding } = useTheme();
  const {
    email,
    setEmail,
    normalizedEmail,
    submitted,
    loading,
    error,
    fieldErrors,
    clearFieldError,
    handleSubmit,
  } = useForgotPassword();

  return (
    <div className="flex min-h-screen">
      <AuthSideBanner
        branding={branding}
        title={
          <>
            Récupération de<br /><span className="text-white/90">mot de passe</span>
          </>
        }
        subtitle="Nous vous enverrons un lien pour réinitialiser votre mot de passe en toute sécurité."
      />

      <div className="relative flex-1 flex items-center justify-center p-8 bg-background">
        <Link to="/" className="absolute right-8 top-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour à la connexion
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-8">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">E-mail envoyé !</h2>
              <p className="text-muted-foreground">
                Un lien de réinitialisation a été envoyé à <strong className="text-foreground">{normalizedEmail}</strong>. Vérifiez votre boîte de réception.
              </p>
            </motion.div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Mot de passe oublié</h2>
                <p className="text-muted-foreground mt-1">Entrez votre adresse e-mail pour déclencher la réinitialisation</p>
              </div>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="utilisateur@domaine.com"
                      {...invalidFieldProps(fieldErrors.email, "pl-10")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                      }}
                      required
                    />
                  </div>
                  <FieldError message={fieldErrors.email} />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 font-semibold" disabled={loading}>
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-5 w-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" />
                  ) : "Envoyer le lien"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

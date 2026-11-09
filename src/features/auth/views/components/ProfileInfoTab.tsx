import React, { useState, useMemo } from "react";
import {
  Mail,
  Shield,
  Building2,
  Copy,
  Check,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, parseUserInfoFromToken, parseJwtPayload } from "@/core/security/authStore";
import { getProfileRoleDisplayLabel } from "@/features/utilisateurs/models/profileLabels";
import { type ProfileEntity, useProfileEntities } from "../../viewmodels/useProfileEntities";

const EntityItem = ({ label, entities }: { label: string; entities: ProfileEntity[] }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
      {entities.map((entity) => (
        <div key={entity.id} className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          {entity.name ? (
            <span className="text-sm font-medium text-foreground">{entity.name}</span>
          ) : (
            <span className="text-xs font-mono text-muted-foreground break-all">{entity.id}</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

/** Claims du jeton exploités en repli pour l'affichage du profil. */
type ProfileTokenPayload = {
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
};

export const ProfileInfoTab: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const rawPayload = useMemo(() => parseJwtPayload<ProfileTokenPayload>(token), [token]);
  const tokenUser = parseUserInfoFromToken(token ?? undefined);

  const username = tokenUser.username ?? user?.username ?? rawPayload?.preferred_username ?? user?.email ?? "";
  const firstName = tokenUser.firstName ?? user?.firstName ?? rawPayload?.given_name ?? "";
  const lastName = tokenUser.lastName ?? user?.lastName ?? rawPayload?.family_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || rawPayload?.name || username || "Utilisateur";
  const email = tokenUser.email ?? user?.email ?? rawPayload?.email ?? "";
  const emailVerified = rawPayload?.email_verified;

  const roleLabel = getProfileRoleDisplayLabel(user);
  const entityContext = user?.entityContext || "Administration";
  // Partenaire : son identifiant (groupe PARTNER du jeton) est rangé avec celui de la structure
  const isPartner = user?.entityContext === "Partenaire";
  const institutionId = isPartner ? undefined : user?.institutionId;
  const entities = useProfileEntities({
    productId: user?.productId,
    institutionId,
    partnerId: isPartner ? user?.institutionId : undefined,
    distributorId: user?.distributorId,
    agencyIds: user?.agencyIds?.length ? user.agencyIds : user?.agencyId ? [user.agencyId] : [],
    caisseId: user?.caisseId,
  });

  const initials = useMemo(() => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (fullName && fullName.length >= 2) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return fullName.slice(0, 2).toUpperCase();
    }
    return "AV";
  }, [firstName, lastName, fullName]);

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copié dans le presse-papier`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card className="w-full rounded-xl border border-border/60 bg-card shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-xs bg-gradient-to-tr from-primary to-accent shrink-0">
            <AvatarFallback className="text-lg font-bold text-primary-foreground bg-gradient-to-tr from-primary to-accent">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold text-foreground truncate">{fullName}</CardTitle>
            <CardDescription className="text-xs truncate flex items-center gap-1.5 mt-0.5">
              <span>@{username}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
          {/* Prénom */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prénom</p>
            <p className="text-sm font-medium text-foreground">{firstName || "Non renseigné"}</p>
          </div>

          {/* Nom de famille */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom de famille</p>
            <p className="text-sm font-medium text-foreground">{lastName || "Non renseigné"}</p>
          </div>

          {/* Contexte d'entité */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexte d'entité</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Layers className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm font-semibold text-foreground">{entityContext}</span>
            </div>
          </div>

          {/* Nom d'utilisateur */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom d'utilisateur</p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-sm font-mono font-medium text-foreground">{username || "Non renseigné"}</span>
              {username && (
                <button
                  type="button"
                  onClick={() => handleCopy(username, "Nom d'utilisateur")}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title="Copier le nom d'utilisateur"
                >
                  {copiedField === "Nom d'utilisateur" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Adresse e-mail */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adresse e-mail</p>
              {emailVerified !== undefined && (
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 px-1.5 ${
                    emailVerified
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  }`}
                >
                  {emailVerified ? "Vérifiée" : "Non vérifiée"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">{email || "Non renseignée"}</span>
              {email && (
                <button
                  type="button"
                  onClick={() => handleCopy(email, "Adresse e-mail")}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title="Copier l'adresse e-mail"
                >
                  {copiedField === "Adresse e-mail" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Rôle métier */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle métier</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{roleLabel}</span>
            </div>
          </div>

          {/* Entités de rattachement : noms retrouvés par identifiant, l'identifiant s'affiche s'il est introuvable */}
          {entities.product && <EntityItem label="Produit" entities={[entities.product]} />}
          {entities.partner && <EntityItem label="Partenaire" entities={[entities.partner]} />}
          {entities.structure ? (
            <EntityItem label="Structure" entities={[entities.structure]} />
          ) : (
            !institutionId && !isPartner && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Structure</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">Périmètre Global</span>
                </div>
              </div>
            )
          )}
          {entities.distributor && <EntityItem label="Distributeur rattaché" entities={[entities.distributor]} />}
          {entities.agencies.length > 0 && (
            <EntityItem
              label={entities.agencies.length > 1 ? "Agences rattachées" : "Agence rattachée"}
              entities={entities.agencies}
            />
          )}
          {entities.caisse && <EntityItem label="Caisse rattachée" entities={[entities.caisse]} />}
        </div>
      </CardContent>
    </Card>
  );
};

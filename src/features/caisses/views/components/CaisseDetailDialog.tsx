import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Calendar,
  Edit,
  Landmark,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import type { CaisseRead } from "../../models/types";
import { fetchCaisseById } from "../../services/caissesService";

interface CaisseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caisse: CaisseRead | null;
  caisseId?: string | null;
  agencyName?: string;
  parentTypeName?: string;
  canUpdate?: boolean;
  onEdit?: (caisse: CaisseRead) => void;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateString;
  }
};

export const CaisseDetailDialog: React.FC<CaisseDetailDialogProps> = ({
  open,
  onOpenChange,
  caisse,
  caisseId,
  agencyName,
  parentTypeName,
  canUpdate = false,
  onEdit,
}) => {
  const targetId = caisseId || caisse?.id;
  const [data, setData] = useState<CaisseRead | null>(caisse);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Appel systématique à GET /api/v1/organisation/caisses/{id} à l'ouverture
  useEffect(() => {
    if (!open || !targetId) {
      if (!open) {
        setError(null);
        setCopiedId(false);
      }
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    // Initialise avec le caisse partiel si disponible
    if (caisse && caisse.id === targetId) {
      setData(caisse);
    }

    fetchCaisseById(targetId)
      .then((res) => {
        if (active) {
          setData(res);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("[CaisseDetailDialog] Erreur GET /api/v1/organisation/caisses/{id}:", err);
          // Garde la version en cache si disponible
          if (!caisse) {
            setError("Impossible de charger les informations de la caisse.");
          }
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, targetId, caisse]);

  const currentCaisse = data || caisse;
  if (!open) return null;

  const parentType = currentCaisse?.parent_type || parentTypeName;
  const parentTypeLabel = parentType === "DISTRIBUTOR" ? "Distributeur" : "Structure";

  const handleCopyId = () => {
    if (!currentCaisse?.id) return;
    navigator.clipboard.writeText(currentCaisse.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center shadow-sm text-accent-foreground shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate text-foreground">
                {currentCaisse?.name || "Détails de la caisse"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 mt-1">
                  {currentCaisse?.code && (
                    <span className="font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                      {currentCaisse.code}
                    </span>
                  )}
                  {currentCaisse && (
                    <Badge
                      className={
                        currentCaisse.is_active
                          ? "bg-accent/15 text-accent border-accent/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }
                      variant="outline"
                    >
                      {currentCaisse.is_active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                  {loading && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      Actualisation…
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !currentCaisse ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm">Chargement des détails de la caisse…</p>
          </div>
        ) : currentCaisse ? (
          <div className="space-y-4 py-2">
            {/* Section 1 : Informations Générales */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Building2 className="h-4.5 w-4.5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Informations Générales</h3>
                  <p className="text-xs text-muted-foreground">
                    Caractéristiques et identifiants de rattachement
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Nom de la caisse</span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentCaisse.name}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Code caisse</span>
                  <p className="text-sm font-semibold text-foreground font-mono">
                    {currentCaisse.code || "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Agence</span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {agencyName || currentCaisse.agency_id}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Rattachement</span>
                  <div className="flex items-center gap-1.5">
                    {parentType ? (
                      <Badge
                        variant={parentType === "DISTRIBUTOR" ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {parentTypeLabel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Statut</span>
                  <div>
                    <Badge
                      className={
                        currentCaisse.is_active
                          ? "bg-accent/15 text-accent border-accent/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }
                      variant="outline"
                    >
                      {currentCaisse.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">ID Système</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[170px]">
                      {currentCaisse.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={handleCopyId}
                      title="Copier l'identifiant"
                    >
                      {copiedId ? (
                        <Check className="h-3 w-3 text-accent" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 : Traçabilité & Historique */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Calendar className="h-4.5 w-4.5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Traçabilité & Dates</h3>
                  <p className="text-xs text-muted-foreground">
                    Historique temporel d'activation et désactivation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Activée le</span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(currentCaisse.activated_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Désactivée le</span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(currentCaisse.deactivated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-border/50 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          {canUpdate && onEdit && currentCaisse && (
            <Button
              type="button"
              className="gradient-accent text-accent-foreground hover:opacity-90 gap-1.5"
              onClick={() => {
                onOpenChange(false);
                onEdit(currentCaisse);
              }}
            >
              <Edit className="h-4 w-4" />
              Modifier la caisse
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

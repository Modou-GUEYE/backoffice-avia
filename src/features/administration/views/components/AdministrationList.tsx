import React from "react";
import { RefreshCw, Pencil, Power, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAdministration } from "../../viewmodels/useAdministration";

interface AdministrationListCardProps {
  vm: ReturnType<typeof useAdministration>;
}

export const AdministrationListCard: React.FC<AdministrationListCardProps> = ({ vm }) => {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Administrations enregistrées
          </h2>
          <p className="text-xs text-muted-foreground">
            Liste des entités d'administration faîtières de la plateforme.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={vm.loadAdministrations}
          disabled={vm.isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${vm.isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <Separator />

      {vm.isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Chargement des administrations...
        </div>
      ) : vm.administrations.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
          <Building2 className="h-8 w-8 mx-auto opacity-40" />
          <p>Aucune administration enregistrée pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vm.administrations.map((administration) => (
            <div
              key={administration.id}
              className="rounded-xl border border-border/40 p-4 space-y-3 bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {administration.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {administration.id}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    administration.is_active
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {administration.is_active ? "Actif" : "Inactif"}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>Email: {administration.contact_email || "-"}</p>
                <p>Téléphone: {administration.contact_phone || "-"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => vm.editAdministration(administration)}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Modifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => vm.setAdministrationToToggle(administration)}
                >
                  <Power className="h-4 w-4 mr-2" />
                  {administration.is_active ? "Désactiver" : "Activer"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => vm.setAdministrationToDelete(administration)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Building2,
  Loader2,
  Palette,
  Save,
} from "lucide-react";
import BrandingForm from "@/shared/components/BrandingForm";
import { DEFAULT_BRANDING_COLORS } from "../../models/data";
import { EntityBranding } from "@/core/theme/ThemeContext";
import { StructureServicePaymentFlowsCard } from "./components/StructureServicePaymentFlowsCard";
import type { StructureDetailVm } from "./types";

export const StructureConfigurationsTab: React.FC<{ vm: StructureDetailVm }> = ({ vm }) => {
  if (!vm.structure) return null;

  const branding = vm.structure.branding_config
    ? (vm.structure.branding_config as unknown as Partial<EntityBranding>)
    : vm.structureBranding;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Paramètres de configuration</h2>
          <p className="text-xs text-muted-foreground">Gestion des offres de services et de l'identité visuelle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offre & Package de Services */}
        <div className="glass-card rounded-xl p-6 space-y-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Offre & Package de Services</h3>
                <p className="text-xs text-muted-foreground">Gestion de l'abonnement et des fonctionnalités groupées</p>
              </div>
            </div>
            {vm.activeAssignment && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Statut :</span>
                {vm.activeAssignment.status === "ACTIVE" && (
                  <span className="px-2.5 py-1 rounded-full font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    Actif
                  </span>
                )}
                {vm.activeAssignment.status === "SUSPENDED" && (
                  <span className="px-2.5 py-1 rounded-full font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Suspendu
                  </span>
                )}
                {vm.activeAssignment.status === "TERMINATED" && (
                  <span className="px-2.5 py-1 rounded-full font-medium bg-red-500/15 text-red-500 border border-red-500/30">
                    Résilié
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
            {vm.permissions.canUpdate ? (
              <div className="space-y-1.5 w-full sm:w-72 md:w-80 shrink-0">
                <Label className="text-xs font-medium text-muted-foreground">Package de services</Label>
                <Select
                  value={vm.form.packageId}
                  onValueChange={(v) => vm.setForm({ ...vm.form, packageId: v })}
                >
                  <SelectTrigger className="w-full h-10 bg-background/50">
                    <SelectValue placeholder="Sélectionner un package" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-3 rounded-lg border bg-muted/5 w-full sm:w-72 md:w-80 shrink-0">
                <span className="text-xs text-muted-foreground block">Package actuellement assigné</span>
                <span className="text-sm font-medium text-foreground">
                  {vm.associatedPackage?.label || (vm.structure.package ? vm.resolvePackageName(vm.structure.package) : "Aucun package assigné")}
                </span>
              </div>
            )}

            {/* Boutons d'assignation / actions de gestion */}
            {vm.permissions.canUpdate && (
              <div className="flex flex-wrap items-center gap-2 pb-0.5">
                {(() => {
                  const currentPkgId = vm.activeAssignment?.status !== "TERMINATED" ? vm.activeAssignment?.package_id : null;
                  const selectedPkgId = vm.form.packageId;
                  const hasChanged = Boolean(selectedPkgId && selectedPkgId !== currentPkgId);
                  const isTerminated = vm.activeAssignment?.status === "TERMINATED";
                  const noAssignment = !vm.activeAssignment || isTerminated;

                  if (hasChanged || (selectedPkgId && noAssignment)) {
                    return (
                      <Button
                        type="button"
                        onClick={vm.handleAssignOrChangePackage}
                        disabled={vm.isSaving || !selectedPkgId}
                        className="gradient-accent text-accent-foreground hover:opacity-90 text-xs py-2 px-4 h-10 font-medium"
                      >
                        {vm.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        {noAssignment ? "Assigner le package" : "Changer de package"}
                      </Button>
                    );
                  }
                  return null;
                })()}

                {vm.activeAssignment?.status === "ACTIVE" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={vm.handleSuspendPackage}
                      disabled={vm.isSaving}
                      className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500 text-xs py-2 px-3.5 h-10 font-medium"
                    >
                      Suspendre
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={vm.handleTerminatePackage}
                      disabled={vm.isSaving}
                      className="text-xs py-2 px-3.5 h-10 font-medium"
                    >
                      Résilier définitivement
                    </Button>
                  </>
                )}

                {vm.activeAssignment?.status === "SUSPENDED" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={vm.handleResumePackage}
                      disabled={vm.isSaving}
                      className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs py-2 px-3.5 h-10 font-medium"
                    >
                      Réactiver
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={vm.handleTerminatePackage}
                      disabled={vm.isSaving}
                      className="text-xs py-2 px-3.5 h-10 font-medium"
                    >
                      Résilier définitivement
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flux de paiement des Services (Étape 3 : Surcharge vs Héritage par Structure) */}
        <StructureServicePaymentFlowsCard
          structureId={vm.structure.id}
          activeAssignment={vm.activeAssignment}
          canUpdate={vm.permissions.canUpdate}
        />

        {/* Configuration Visuelle (Branding) */}
        <div className="glass-card rounded-xl p-6 space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Identité visuelle</h3>
              <p className="text-xs text-muted-foreground">Couleurs et visuels de la structure</p>
            </div>
          </div>

          {vm.permissions.canUpdate ? (
            <div className="p-4 border rounded-xl bg-background/30">
              <BrandingForm
                branding={vm.form}
                onChange={(updated) => vm.setForm({ ...vm.form, ...updated })}
                showLogo={true}
                onLogoFileChange={vm.handleLogoFileChange}
                entityId={vm.structure.id}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Couleurs de l'entité</h4>
                <div className="space-y-2">
                  {[
                    { label: "Primaire", value: branding?.primaryColor, fallback: DEFAULT_BRANDING_COLORS.primaryColor },
                    { label: "Secondaire", value: branding?.secondaryColor, fallback: DEFAULT_BRANDING_COLORS.secondaryColor },
                    { label: "Accent", value: branding?.accentColor, fallback: DEFAULT_BRANDING_COLORS.accentColor },
                    { label: "Menu latéral", value: branding?.sidebarColor, fallback: DEFAULT_BRANDING_COLORS.sidebarColor },
                    { label: "Bordure", value: branding?.borderColor, fallback: DEFAULT_BRANDING_COLORS.borderColor },
                  ].map((c) => {
                    const colorVal = c.value || c.fallback;
                    const bgStyle = colorVal.startsWith("#") || colorVal.startsWith("rgb") ? colorVal : `hsl(${colorVal})`;
                    return (
                      <div key={c.label} className="flex items-center justify-between p-2 rounded-lg border bg-muted/5 text-xs">
                        <span className="font-medium text-foreground">{c.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{colorVal}</span>
                          <div className="h-5 w-5 rounded border shadow-sm" style={{ backgroundColor: bgStyle }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Texte</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/5 space-y-1">
                    <span className="font-medium text-muted-foreground block">Slogan / Tagline</span>
                    <span className="text-foreground font-medium">{branding?.tagline || "Aucun slogan configuré"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo de la structure</h4>
                <div className="p-3 rounded-xl border bg-muted/5 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border border-border/60 bg-white p-2 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {vm.structure.media_url ? (
                      <img
                        src={vm.structure.media_url}
                        alt={vm.structure.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground block">Logo officiel</span>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {vm.structure.media_url || "Aucun logo configuré"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton d'enregistrement pour la charte visuelle */}
          {vm.permissions.canUpdate && (
            <div className="flex justify-end pt-4 border-t border-border/40 mt-4">
              <Button
                onClick={() => vm.handleSave()}
                disabled={vm.isSaving}
                className="gradient-accent text-accent-foreground hover:opacity-90 flex items-center gap-2 font-medium py-2 px-6 shadow-md"
              >
                {vm.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer l'identité visuelle
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

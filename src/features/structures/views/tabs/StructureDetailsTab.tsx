import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Palette,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { EntityBranding } from "@/core/theme/ThemeContext";
import type { StructureDetailVm } from "./types";

export const StructureDetailsTab: React.FC<{ vm: StructureDetailVm }> = ({ vm }) => {
  const navigate = useNavigate();

  if (!vm.structure) return null;

  const branding = vm.structure.branding_config
    ? (vm.structure.branding_config as unknown as Partial<EntityBranding>)
    : vm.structureBranding;

  const hasBranding = Boolean(
    branding &&
      (branding.primaryColor ||
        branding.secondaryColor ||
        branding.accentColor ||
        branding.sidebarColor ||
        branding.borderColor)
  );

  return (
    <div className="space-y-6">
      {/* Informations Générales */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Informations Générales</h3>
            <p className="text-xs text-muted-foreground">Caractéristiques principales et identifiants de la structure</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Pays</span>
            <p className="text-sm font-semibold text-foreground">{vm.structure.address || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Date d'activation</span>
            <p className="text-sm font-semibold text-foreground">{vm.formatDate(vm.structure.activated_at) || "—"}</p>
          </div>

          {vm.structure.deactivated_at && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Date de désactivation</span>
              <p className="text-sm font-semibold text-destructive">{vm.formatDate(vm.structure.deactivated_at)}</p>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Libellé Expéditeur SMS</span>
            <p className="text-sm font-semibold text-foreground">{vm.structure.sender_label || "—"}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Package Associé</span>
            <div>
              {vm.packageLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                  <span>Chargement du package...</span>
                </div>
              ) : vm.associatedPackage ? (
                <button
                  type="button"
                  onClick={() => vm.handleTabChange("configs")}
                  className="text-foreground hover:text-accent font-semibold text-sm flex items-center gap-2 cursor-pointer text-left group transition-colors"
                  title={vm.associatedPackage.description || "Gérer ce package dans l'onglet Configuration"}
                >
                  <span className="group-hover:underline">{vm.associatedPackage.label}</span>
                  {vm.associatedPackage.code && (
                    <Badge
                      variant="outline"
                      className="text-xs font-mono font-normal bg-accent/5 text-accent border-accent/20 group-hover:bg-accent/15"
                    >
                      {vm.associatedPackage.code}
                    </Badge>
                  )}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent shrink-0" />
                </button>
              ) : vm.structure.package ? (
                <p className="text-sm font-semibold text-foreground">
                  {vm.resolvePackageName(vm.structure.package)}
                </p>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">Aucun package</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium block">Produit Financier Associé</span>
            <div>
              {vm.structure.product_id ? (
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/produits/${vm.structure.product_id}`)}
                  className="text-accent hover:underline font-semibold text-sm flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <span>{vm.resolveProductName(vm.structure.product_id)}</span>
                  <ExternalLink className="h-3 w-3 inline shrink-0" />
                </button>
              ) : (
                <p className="text-sm font-semibold text-foreground">Aucun produit</p>
              )}
            </div>
          </div>

          {vm.structure.description && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-1.5 pt-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground font-medium block">Description</span>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {vm.structure.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contacts & Identité visuelle */}
      <div className={`grid grid-cols-1 ${hasBranding ? "md:grid-cols-2" : ""} gap-6`}>
        {/* Contacts */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Contacts de la Structure</h3>
                <p className="text-xs text-muted-foreground">Coordonnées directes et canaux de communication</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Email de contact</span>
              <p className="text-sm font-semibold text-foreground break-words">
                {vm.structure.contact_email ? (
                  <a href={`mailto:${vm.structure.contact_email}`} className="text-accent hover:underline">
                    {vm.structure.contact_email}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium block">Téléphone de contact</span>
              <p className="text-sm font-semibold text-foreground">
                {vm.structure.contact_phone ? (
                  <a href={`tel:${vm.structure.contact_phone}`} className="text-accent hover:underline">
                    {vm.structure.contact_phone}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Couleurs de la structure */}
        {hasBranding && (
          <div className="glass-card rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/40 gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Palette className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Identité visuelle</h3>
                  <p className="text-xs text-muted-foreground">Couleurs et visuels de la structure</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap pt-2">
              {Boolean(branding?.primaryColor) && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border shadow-xs"
                    style={{
                      backgroundColor:
                        String(branding?.primaryColor).startsWith("#") ||
                        String(branding?.primaryColor).startsWith("rgb")
                          ? String(branding?.primaryColor)
                          : `hsl(${branding?.primaryColor})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Primaire</span>
                </div>
              )}
              {Boolean(branding?.secondaryColor) && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border shadow-xs"
                    style={{
                      backgroundColor:
                        String(branding?.secondaryColor).startsWith("#") ||
                        String(branding?.secondaryColor).startsWith("rgb")
                          ? String(branding?.secondaryColor)
                          : `hsl(${branding?.secondaryColor})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Secondaire</span>
                </div>
              )}
              {Boolean(branding?.accentColor) && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border shadow-xs"
                    style={{
                      backgroundColor:
                        String(branding?.accentColor).startsWith("#") ||
                        String(branding?.accentColor).startsWith("rgb")
                          ? String(branding?.accentColor)
                          : `hsl(${branding?.accentColor})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Accent</span>
                </div>
              )}
              {Boolean(branding?.sidebarColor) && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border shadow-xs"
                    style={{
                      backgroundColor:
                        String(branding?.sidebarColor).startsWith("#") ||
                        String(branding?.sidebarColor).startsWith("rgb")
                          ? String(branding?.sidebarColor)
                          : `hsl(${branding?.sidebarColor})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Sidebar</span>
                </div>
              )}
              {Boolean(branding?.borderColor) && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-4 w-4 rounded-full border shadow-xs"
                    style={{
                      backgroundColor:
                        String(branding?.borderColor).startsWith("#") ||
                        String(branding?.borderColor).startsWith("rgb")
                          ? String(branding?.borderColor)
                          : `hsl(${branding?.borderColor})`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Bordure</span>
                </div>
              )}
            </div>
            {branding?.tagline && (
              <div className="text-xs pt-4 border-t border-border/40">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Slogan</span>
                <span className="font-medium text-foreground">{branding.tagline}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

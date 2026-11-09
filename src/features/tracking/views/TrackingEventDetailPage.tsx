import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Building2, Code2, Copy, History, Loader2, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackingResultBadge } from "./components/TrackingResultBadge";
import { useTrackingEventDetail } from "../viewmodels/useTrackingEventDetail";
import {
  TRACKING_ENTITE_LABELS,
  TRACKING_SOURCE_LABELS,
  formatTrackingDate,
  formatTrackingUserAgent,
  getTrackingMethodBadgeClass,
} from "../viewmodels/useTrackingEvents";

const isPresent = (value?: string | null): value is string =>
  Boolean(value && value.trim() !== "" && value.trim() !== "-");

type InfoItemProps = { label: string; children: React.ReactNode; className?: string };

const InfoItem = ({ label, children, className = "" }: InfoItemProps) => (
  <div className={`space-y-1 min-w-0 ${className}`}>
    <span className="text-xs text-muted-foreground font-medium block">{label}</span>
    <div className="text-sm font-semibold text-foreground break-words">{children}</div>
  </div>
);

type SectionCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
};

const SectionCard = ({ icon: Icon, title, description, delay, children }: SectionCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card rounded-xl p-6 space-y-6"
  >
    <div className="flex items-center gap-3 pb-4 border-b border-border/40">
      <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

export const TrackingEventDetailPage = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const vm = useTrackingEventDetail(eventId);
  const event = vm.event;

  const goBack = () => navigate("/dashboard/tracking");

  const copyEventId = () => {
    if (!event?.id) return;
    navigator.clipboard.writeText(event.id);
    toast.success("Identifiant copié dans le presse-papiers");
  };

  const sourceLabel = event?.source ? TRACKING_SOURCE_LABELS[event.source] ?? event.source : "";
  const distributeurId = event?.distributeur_id || event?.distributor_id;
  const perimeterItems = event
    ? [
        { label: "Produit", value: event.product_id ? vm.getProduitName(event.product_id) : null },
        { label: "Structure", value: event.structure_id ? vm.getStructureName(event.structure_id) : null },
        { label: "Distributeur", value: distributeurId ? vm.getDistributeurName(distributeurId) : null },
        { label: "Agence", value: event.agence_id ? vm.getAgenceName(event.agence_id) : null },
        { label: "Caisse", value: event.caisse_id ? vm.getCaisseName(event.caisse_id) : null },
      ].filter((item): item is { label: string; value: string } => isPresent(item.value))
    : [];

  let body: React.ReactNode;
  if (vm.loading) {
    body = (
      <div className="glass-card rounded-xl py-16 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span>Chargement de l'événement...</span>
      </div>
    );
  } else if (!event) {
    body = (
      <div className="glass-card rounded-xl py-12 text-center text-destructive space-y-2">
        <AlertCircle className="h-8 w-8 mx-auto" />
        <p className="font-semibold text-sm">{vm.error || "Impossible de récupérer le détail de l'événement."}</p>
      </div>
    );
  } else {
    body = (
      <>
        <SectionCard icon={History} title="Informations de l'événement" description="Action tracée, module concerné et résultat" delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoItem label="Action">{event.action || "—"}</InfoItem>
            <InfoItem label="Module concerné">{sourceLabel || "—"}</InfoItem>
            <InfoItem label="Résultat">
              <TrackingResultBadge result={event.resultat_action} />
            </InfoItem>
            <InfoItem label="Date & heure">{formatTrackingDate(event.event_timestamp)}</InfoItem>
            {isPresent(event.event_label) && (
              <InfoItem label="Libellé" className="sm:col-span-2 lg:col-span-4">
                {event.event_label}
              </InfoItem>
            )}
            <InfoItem label="Identifiant de l'événement" className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-normal text-muted-foreground break-all">{event.id}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={copyEventId}
                  aria-label="Copier l'identifiant"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </InfoItem>
          </div>
        </SectionCard>

        <SectionCard icon={User} title="Auteur de l'action" description="Utilisateur, profil et poste à l'origine de l'action" delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <InfoItem label="Utilisateur">{event.utilisateur || "—"}</InfoItem>
            <InfoItem label="Profil">{event.profil || "—"}</InfoItem>
            <InfoItem label="Niveau">{event.entite ? TRACKING_ENTITE_LABELS[event.entite] ?? event.entite : "—"}</InfoItem>
            <InfoItem label="Adresse IP">
              <span className="font-mono">{event.adresse_ip || "—"}</span>
            </InfoItem>
            <InfoItem label="Navigateur & appareil">{formatTrackingUserAgent(event.navigateur)}</InfoItem>
          </div>
        </SectionCard>

        {perimeterItems.length > 0 && (
          <SectionCard icon={Building2} title="Périmètre" description="Entités rattachées à l'action" delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {perimeterItems.map((item) => (
                <InfoItem key={item.label} label={item.label}>
                  {item.value}
                </InfoItem>
              ))}
            </div>
          </SectionCard>
        )}

        {(isPresent(event.method) || isPresent(event.endpoint) || isPresent(event.navigateur)) && (
          <SectionCard icon={Code2} title="Requête technique" description="Appel API et agent utilisateur enregistrés" delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <InfoItem label="Méthode HTTP">
                {isPresent(event.method) ? (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${getTrackingMethodBadgeClass(event.method)}`}>
                    {event.method}
                  </span>
                ) : (
                  "—"
                )}
              </InfoItem>
              <InfoItem label="Endpoint" className="sm:col-span-3">
                <span className="font-mono font-normal text-xs break-all">{event.endpoint || "—"}</span>
              </InfoItem>
              {isPresent(event.navigateur) && (
                <InfoItem label="User-Agent" className="sm:col-span-4">
                  <p className="font-mono font-normal text-[11px] break-all select-all bg-muted/30 p-2 rounded-lg border border-border/50">
                    {event.navigateur}
                  </p>
                </InfoItem>
              )}
            </div>
          </SectionCard>
        )}
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent hover:text-inherit shrink-0"
            onClick={goBack}
            aria-label="Retour au tracking"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-14 w-14 rounded-2xl border border-border/80 bg-background/50 backdrop-blur-sm shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            <div className="h-full w-full bg-accent/10 flex items-center justify-center text-accent">
              <History className="h-7 w-7" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{event?.action || "Détail de l'événement"}</h1>
            <p className="text-muted-foreground text-sm">
              {event
                ? [sourceLabel, formatTrackingDate(event.event_timestamp)].filter(Boolean).join(" · ")
                : "Tracking & Audit des actions"}
            </p>
          </div>
        </div>
      </motion.div>

      {body}
    </div>
  );
};

export default TrackingEventDetailPage;

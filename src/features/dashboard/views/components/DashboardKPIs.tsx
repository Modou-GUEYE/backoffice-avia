import React from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Clock, Coins, Hourglass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSummaryResponse } from "../../models/types";

interface DashboardKPIsProps {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
}

const formatCurrency = (amount: number): string => {
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  );
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("fr-FR").format(num);
};

type Tone = "blue" | "violet" | "amber" | "teal";

/** Teintes (fond transparent + texte) de l'icône de chaque carte. */
const TONES: Record<Tone, { tile: string }> = {
  blue: { tile: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  violet: { tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  amber: { tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  teal: { tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

interface KpiCardProps {
  index: number;
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: Tone;
  /** Carte mise en avant : fond sombre dégradé */
  featured?: boolean;
  badge?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ index, label, value, hint, icon, tone, featured, badge }) => {
  const t = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-shadow hover:shadow-[var(--shadow-elevated)] ${
        featured
          ? "border-transparent bg-sidebar text-white shadow-[var(--shadow-elevated)]"
          : "bg-card border-border/60 shadow-[var(--shadow-card)]"
      }`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-xs font-medium ${featured ? "text-white/70" : "text-muted-foreground"}`}>{label}</span>
          <div
            className={`mt-2 text-2xl font-bold tracking-tight tabular-nums break-words ${
              featured ? "text-white" : "text-foreground"
            }`}
          >
            {value}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            featured ? "bg-white/15 text-white" : t.tile
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <p className={`text-xs ${featured ? "text-white/65" : "text-muted-foreground"}`}>{hint}</p>
        {badge}
      </div>
    </motion.div>
  );
};

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  summary,
  loading,
}) => {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    );
  }

  // Métriques directes 1:1 du contrat OpenAPI (GET /dashboard/summary)
  const volumeTotal = summary?.volume_total ?? 0;
  const nbTransactions = summary?.nombre_transactions ?? 0;
  const enCoursNb = summary?.en_cours?.nombre ?? 0;
  const enCoursVol = summary?.en_cours?.volume ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Volume Total (volume_total) */}
      <KpiCard
        index={0}
        featured
        tone="blue"
        label="Volume Total"
        value={formatCurrency(volumeTotal)}
        hint="Flux cumulé sur la période"
        icon={<Coins className="h-5 w-5" />}
      />

      {/* 2. Total Transactions (nombre_transactions) */}
      <KpiCard
        index={1}
        tone="violet"
        label="Transactions"
        value={formatNumber(nbTransactions)}
        hint="Opérations enregistrées"
        icon={<ArrowLeftRight className="h-5 w-5" />}
      />

      {/* 3. Transactions en cours (en_cours.nombre) */}
      <KpiCard
        index={2}
        tone="amber"
        label="Transactions en cours"
        value={formatNumber(enCoursNb)}
        hint="Opérations en attente de finalisation"
        icon={<Clock className="h-5 w-5" />}
        badge={
          enCoursNb > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              En attente
            </span>
          ) : undefined
        }
      />

      {/* 4. Volume en cours (en_cours.volume) */}
      <KpiCard
        index={3}
        tone="teal"
        label="Volume en cours"
        value={formatCurrency(enCoursVol)}
        hint="Flux financier en cours de traitement"
        icon={<Hourglass className="h-5 w-5" />}
      />
    </div>
  );
};

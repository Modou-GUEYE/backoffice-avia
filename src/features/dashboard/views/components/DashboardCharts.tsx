import React, { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSummaryResponse, TypeSummary } from "../../models/types";
import {
  BarChart3,
  Package,
  ArrowUpDown,
  CreditCard,
  Building2,
} from "lucide-react";

interface DashboardChartsProps {
  summary: DashboardSummaryResponse | null;
  loading: boolean;
}

type Metric = "volume" | "nombre";

interface Slice {
  name: string;
  volume: number;
  nombre: number;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";

const formatNumber = (val: number): string =>
  new Intl.NumberFormat("fr-FR").format(val);

const formatMetric = (val: number, metric: Metric): string =>
  metric === "volume" ? formatCurrency(val) : `${formatNumber(val)} tx`;

/** Palette catégorielle lisible en clair comme en sombre. */
const PALETTE = [
  "hsl(220 88% 56%)",
  "hsl(172 66% 42%)",
  "hsl(262 80% 62%)",
  "hsl(38 92% 54%)",
  "hsl(340 82% 60%)",
  "hsl(199 89% 52%)",
  "hsl(98 52% 48%)",
  "hsl(24 90% 56%)",
];
const colorOf = (index: number) => PALETTE[index % PALETTE.length];

// Transforme le dictionnaire du contrat OpenAPI (TypeSummary) en liste triée
const transformDistribution = (
  record: Record<string, TypeSummary> | undefined,
  metric: Metric,
): Slice[] => {
  if (!record || Object.keys(record).length === 0) return [];
  const list = Object.entries(record).map(([name, data]) => ({
    name: name || "Non spécifié",
    volume: data?.volume || 0,
    nombre: data?.nombre || 0,
  }));
  list.sort((a, b) => b[metric] - a[metric]);
  return list;
};

const MetricToggle: React.FC<{
  metric: Metric;
  onChange: (metric: Metric) => void;
}> = ({ metric, onChange }) => {
  const pillId = useId();
  return (
    <div className="relative inline-flex items-center rounded-full border border-border/50 bg-muted/60 p-0.5 text-xs">
      {(["volume", "nombre"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`relative z-10 cursor-pointer rounded-full px-3 py-1 font-medium transition-colors ${
            metric === m
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {metric === m && (
            <motion.span
              layoutId={pillId}
              className="absolute inset-0 -z-10 rounded-full gradient-accent shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          {m === "volume" ? "Volume" : "Nombre"}
        </button>
      ))}
    </div>
  );
};

const SliceTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: Slice }>;
}> = ({ active, payload }) => {
  const data = payload?.[0]?.payload;
  if (!active || !data) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-1 font-semibold text-popover-foreground">
        {data.name}
      </div>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-4">
          <span>Nombre</span>
          <span className="font-medium text-foreground">
            {formatNumber(data.nombre)} tx
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Volume</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(data.volume)}
          </span>
        </div>
      </div>
    </div>
  );
};

/** Liste de légende : pastille colorée, nom, valeur et jauge relative au plus grand élément. */
const LegendRows: React.FC<{
  data: Slice[];
  metric: Metric;
  activeIndex: number | null;
  onActive: (index: number | null) => void;
  ranked?: boolean;
}> = ({ data, metric, activeIndex, onActive, ranked }) => {
  const max = Math.max(...data.map((d) => d[metric]), 1);
  return (
    <ul className="space-y-1">
      {data.map((item, i) => {
        const dimmed = activeIndex !== null && activeIndex !== i;
        return (
          <li
            key={item.name}
            onMouseEnter={() => onActive(i)}
            onMouseLeave={() => onActive(null)}
            className={`rounded-lg px-2.5 py-2 transition-all ${
              activeIndex === i ? "bg-muted/70" : "hover:bg-muted/40"
            } ${dimmed ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              {ranked ? (
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                  style={{ background: colorOf(i) }}
                >
                  {i + 1}
                </span>
              ) : (
                <span
                  className="h-3 w-3 shrink-0 rounded-[4px]"
                  style={{ background: colorOf(i) }}
                />
              )}
              <span
                className="min-w-0 flex-1 truncate text-xs font-medium text-foreground"
                title={item.name}
              >
                {item.name}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                {formatMetric(item[metric], metric)}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                key={metric}
                className="h-full rounded-full"
                style={{ background: colorOf(i) }}
                initial={{ width: 0 }}
                animate={{ width: `${(item[metric] / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

interface DistributionCardProps {
  index: number;
  title: string;
  icon: React.ReactNode;
  data: Slice[];
  metric: Metric;
  onMetricChange: (metric: Metric) => void;
  /** « donut » : anneau + légende ; « ranking » : classement en barres */
  variant: "donut" | "ranking";
  className?: string;
  emptyMessage?: string;
}

const DistributionCard: React.FC<DistributionCardProps> = ({
  index,
  title,
  icon,
  data,
  metric,
  onMetricChange,
  variant,
  className = "",
  emptyMessage = "Aucune donnée pour les filtres sélectionnés",
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasValues = data.some((d) => d[metric] > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: 0.1 + index * 0.07,
        ease: "easeOut",
      }}
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <header className="relative mb-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <h3 className="pt-1 text-sm font-semibold leading-snug text-foreground">{title}</h3>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {metric === "volume" ? "Volume en FCFA" : "Nombre d'opérations"}
          </p>
          <MetricToggle metric={metric} onChange={onMetricChange} />
        </div>
      </header>

      {data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
          {emptyMessage}
        </div>
      ) : variant === "donut" ? (
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative mx-auto h-[200px] w-[200px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <PieChart>
                <Pie
                  data={
                    hasValues ? data : data.map((d) => ({ ...d, [metric]: 1 }))
                  }
                  dataKey={metric}
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={data.length > 1 ? 3 : 0}
                  cornerRadius={6}
                  stroke="none"
                  animationDuration={700}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((item, i) => (
                    <Cell
                      key={item.name}
                      fill={colorOf(i)}
                      opacity={
                        activeIndex === null || activeIndex === i ? 1 : 0.35
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<SliceTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {data.length}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {data.length > 1 ? "catégories" : "catégorie"}
              </span>
            </div>
          </div>
          <div className="max-h-[220px] w-full overflow-y-auto pr-1">
            <LegendRows
              data={data}
              metric={metric}
              activeIndex={activeIndex}
              onActive={setActiveIndex}
            />
          </div>
        </div>
      ) : (
        <div className="relative max-h-[320px] overflow-y-auto pr-1">
          <LegendRows
            data={data}
            metric={metric}
            activeIndex={activeIndex}
            onActive={setActiveIndex}
            ranked
          />
        </div>
      )}
    </motion.section>
  );
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  summary,
  loading,
}) => {
  // 5 états de métriques indépendants pour les 5 propriétés du contrat OpenAPI
  const [serviceMetric, setServiceMetric] = useState<Metric>("volume");
  const [productMetric, setProductMetric] = useState<Metric>("volume");
  const [sensMetric, setSensMetric] = useState<Metric>("volume");
  const [paymentMetric, setPaymentMetric] = useState<Metric>("volume");
  const [distributorMetric, setDistributorMetric] = useState<Metric>("volume");

  const serviceData = useMemo(
    () => transformDistribution(summary?.service, serviceMetric),
    [summary?.service, serviceMetric],
  );
  const productData = useMemo(
    () => transformDistribution(summary?.produit, productMetric),
    [summary?.produit, productMetric],
  );
  const sensData = useMemo(
    () => transformDistribution(summary?.sens, sensMetric),
    [summary?.sens, sensMetric],
  );
  const paymentData = useMemo(
    () => transformDistribution(summary?.moyen_paiement, paymentMetric),
    [summary?.moyen_paiement, paymentMetric],
  );
  const distributorData = useMemo(
    () => transformDistribution(summary?.distributeur, distributorMetric),
    [summary?.distributeur, distributorMetric],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className={`h-[320px] rounded-2xl ${i === 5 ? "md:col-span-2" : ""}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <DistributionCard
        index={0}
        variant="donut"
        title="Distribution par Service"
        icon={<BarChart3 className="h-4 w-4" />}
        data={serviceData}
        metric={serviceMetric}
        onMetricChange={setServiceMetric}
      />
      <DistributionCard
        index={1}
        variant="donut"
        title="Distribution par Sens (Crédit / Débit)"
        icon={<ArrowUpDown className="h-4 w-4" />}
        data={sensData}
        metric={sensMetric}
        onMetricChange={setSensMetric}
      />
      <DistributionCard
        index={2}
        variant="donut"
        title="Distribution par Moyen de Paiement"
        icon={<CreditCard className="h-4 w-4" />}
        data={paymentData}
        metric={paymentMetric}
        onMetricChange={setPaymentMetric}
      />
      <DistributionCard
        index={3}
        variant="ranking"
        title="Distribution par Produit"
        icon={<Package className="h-4 w-4" />}
        data={productData}
        metric={productMetric}
        onMetricChange={setProductMetric}
      />
      <DistributionCard
        index={4}
        variant="ranking"
        className="md:col-span-2 xl:col-span-2"
        title="Distribution par Distributeur"
        icon={<Building2 className="h-4 w-4" />}
        data={distributorData}
        metric={distributorMetric}
        onMetricChange={setDistributorMetric}
      />
    </div>
  );
};

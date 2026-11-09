import React from "react";
import { Activity, CheckCircle2, CircleAlert, Globe, User } from "lucide-react";
import StatCard from "@/shared/components/StatCard";
import type { TrackingEventSummary } from "../../models/types";

type TrackingSummaryCardsProps = {
  summary: TrackingEventSummary;
};

const formatCount = (value: number) => value.toLocaleString("fr-FR");

export const TrackingSummaryCards: React.FC<TrackingSummaryCardsProps> = ({ summary }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <StatCard title="Total événements" value={formatCount(summary.total_events)} icon={Activity} delay={0} />
    <StatCard title="Utilisateurs distincts" value={formatCount(summary.distinct_users)} icon={User} delay={0.05} />
    <StatCard title="Modules actifs" value={formatCount(summary.active_sources)} icon={Globe} delay={0.1} />
    <StatCard
      title="Opérations réussies"
      value={formatCount(summary.success_operations)}
      icon={CheckCircle2}
      delay={0.15}
    />
    <StatCard
      title="Opérations en échec"
      value={formatCount(summary.failed_operations)}
      icon={CircleAlert}
      delay={0.2}
    />
  </div>
);

export default TrackingSummaryCards;

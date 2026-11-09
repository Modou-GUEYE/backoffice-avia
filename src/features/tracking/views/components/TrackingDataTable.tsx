import React from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TrackingEvent } from "../../models/types";
import { TrackingResultBadge } from "./TrackingResultBadge";
import {
  TRACKING_ENTITE_LABELS,
  TRACKING_SOURCE_LABELS,
} from "../../viewmodels/useTrackingEvents";

type TrackingDataTableProps = {
  loading: boolean;
  events: TrackingEvent[];
  formatDate: (dateStr?: string) => string;
  formatUserAgent: (ua?: string | null) => string;
  openDetail: (id: string) => void;
};

const COLUMN_COUNT = 7;

export const TrackingDataTable: React.FC<TrackingDataTableProps> = ({
  loading,
  events,
  formatDate,
  formatUserAgent,
  openDetail,
}) => {
  let body: React.ReactNode;

  if (loading) {
    body = Array.from({ length: 5 }).map((_, idx) => (
      <TableRow key={idx} className="animate-pulse border-border/30">
        {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
          <TableCell key={cell}>
            <div className="h-4 bg-muted rounded w-20" />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (events.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-12 text-center text-muted-foreground">
          <div className="flex flex-col items-center justify-center gap-2">
            <History className="h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium text-sm">Aucun événement trouvé</p>
            <p className="text-xs">Modifiez ou réinitialisez les filtres de recherche.</p>
          </div>
        </TableCell>
      </TableRow>
    );
  } else {
    body = events.map((evt) => {
      return (
        <TableRow
          key={evt.id}
          className="border-border/30 hover:bg-muted/30 cursor-pointer"
          onClick={() => openDetail(evt.id)}
          title="Voir le détail de l'événement"
        >
          <TableCell>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium text-foreground">{evt.utilisateur || "-"}</span>
              <span className="text-xs text-muted-foreground">{evt.profil || "-"}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm whitespace-nowrap">{formatDate(evt.event_timestamp)}</TableCell>
          <TableCell className="text-sm font-medium">{evt.action || "-"}</TableCell>
          <TableCell>
            <Badge variant="outline" className="font-normal whitespace-nowrap">
              {evt.source ? TRACKING_SOURCE_LABELS[evt.source] ?? evt.source : "-"}
            </Badge>
          </TableCell>
          <TableCell>
            <TrackingResultBadge result={evt.resultat_action} />
          </TableCell>
          <TableCell className="text-sm text-muted-foreground whitespace-nowrap" title={evt.navigateur || ""}>
            {formatUserAgent(evt.navigateur)}
          </TableCell>
          <TableCell className="text-sm">
            {evt.entite ? TRACKING_ENTITE_LABELS[evt.entite] ?? evt.entite : "-"}
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <div className="overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="border-border/50">
            <TableHead>Utilisateur</TableHead>
            <TableHead>Date & heure</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Résultat</TableHead>
            <TableHead>Navigateur</TableHead>
            <TableHead>Niveau</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{body}</TableBody>
      </Table>
    </div>
  );
};

export default TrackingDataTable;

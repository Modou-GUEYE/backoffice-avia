import StatusBadge from "@/shared/components/StatusBadge";
import { enrollmentStatusLabels } from "@/features/clients/models/enrollmentStatus";

const baseStatusClass = "font-semibold border text-xs shadow-sm";

const enrollmentStatusClasses: Record<string, string> = {
  PENDING: `${baseStatusClass} bg-amber-100 text-amber-900 border-amber-300`,
  UNSUB_PENDING: `${baseStatusClass} bg-orange-100 text-orange-900 border-orange-300`,
  VALIDATED: `${baseStatusClass} bg-emerald-100 text-emerald-900 border-emerald-300`,
  APPROVED: `${baseStatusClass} bg-emerald-100 text-emerald-900 border-emerald-300`,
  UNSUBSCRIBED: `${baseStatusClass} bg-violet-100 text-violet-900 border-violet-300`,
  DEACTIVATED: `${baseStatusClass} bg-slate-200 text-slate-900 border-slate-300`,
  BLOCKED: `${baseStatusClass} bg-slate-200 text-slate-900 border-slate-300`,
  REJECTED: `${baseStatusClass} bg-destructive/15 text-destructive border-destructive/35`,
};

type EnrollmentStatusBadgeProps = {
  status: string;
};

const EnrollmentStatusBadge = ({ status }: EnrollmentStatusBadgeProps) => {
  return (
    <StatusBadge
      status={status}
      labels={enrollmentStatusLabels}
      classes={enrollmentStatusClasses}
    />
  );
};

export default EnrollmentStatusBadge;

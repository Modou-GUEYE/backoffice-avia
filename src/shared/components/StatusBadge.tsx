import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: string;
  labels?: Record<string, string>;
  classes?: Record<string, string>;
  fallbackClassName?: string;
};

const StatusBadge = ({
  status,
  labels,
  classes,
  fallbackClassName = "bg-muted text-muted-foreground border-border",
}: StatusBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={classes?.[status] || fallbackClassName}
    >
      {labels?.[status] || status}
    </Badge>
  );
};

export default StatusBadge;

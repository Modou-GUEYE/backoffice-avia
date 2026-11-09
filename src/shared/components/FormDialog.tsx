import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingOverlay from "./LoadingOverlay";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  submitDisabled?: boolean;
  loading?: boolean;
  contentClassName?: string;
  submitClassName?: string;
  hideFooter?: boolean;
  children: ReactNode;
};

const FormDialog = ({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  onCancel,
  submitDisabled,
  loading,
  contentClassName,
  submitClassName,
  hideFooter,
  children,
}: FormDialogProps) => {
  const handleCancel = () => {
    if (loading) return;
    onCancel?.();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (loading) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {loading && <LoadingOverlay />}

        {children}

        {!hideFooter && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={onSubmit} disabled={submitDisabled || loading} className={submitClassName}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  contentClassName?: string;
  children: ReactNode;
};

const DetailDialog = ({
  open,
  onOpenChange,
  title,
  contentClassName,
  children,
}: DetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default DetailDialog;

import { motion } from "framer-motion";

type LoadingOverlayProps = {
  title?: string;
  description?: string;
};

const LoadingOverlay = ({
  title = "Enregistrement en cours",
  description,
}: LoadingOverlayProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm"
  >
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full"
      />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {description || title}
      </p>
    </div>
  </motion.div>
);

export default LoadingOverlay;
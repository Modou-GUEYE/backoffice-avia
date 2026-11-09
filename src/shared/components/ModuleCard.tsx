import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  features: string[];
  delay?: number;
}

const ModuleCard = ({ title, description, icon: Icon, to, features, delay = 0 }: ModuleCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        to={to}
        className="group block glass-elevated rounded-xl p-6 hover:shadow-[var(--shadow-elevated)] hover:border-accent/30 transition-all duration-300"
      >
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{title}</h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {features.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ModuleCard;

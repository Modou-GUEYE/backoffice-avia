import React from "react";
import { motion } from "framer-motion";
import authBg from "@/assets/auth-bg.jpg";
import aviaLogo from "@/assets/logo_AVIA.png";

export interface AuthSideBannerProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  branding?: {
    entityName?: string;
    tagline?: string;
    loginBgUrl?: string;
    logoUrl?: string;
    features?: string[];
  };
  children?: React.ReactNode;
}

export const AuthSideBanner: React.FC<AuthSideBannerProps> = ({
  title,
  subtitle,
  branding = {},
  children,
}) => {
  const bgImage = branding.loginBgUrl || authBg;
  const logoUrl = branding.logoUrl || aviaLogo;

  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-primary opacity-80" />

      {/* Decorative animated background blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/12 blur-2xl"
        animate={{ x: [0, 40, -20, 0], y: [0, 20, -30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-80px] right-[-60px] h-80 w-80 rounded-full bg-accent/25 blur-3xl"
        animate={{ x: [0, -35, 15, 0], y: [0, -25, 10, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/3 right-20 h-24 w-24 rounded-full bg-white/10 blur-xl"
        animate={{ y: [0, -18, 12, 0], opacity: [0.35, 0.7, 0.4, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        {/* Logo & Entity name */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <img src={logoUrl} alt={branding.entityName || "AVIA"} className="h-10 w-10 rounded-lg object-contain" />
          <span className="text-xl font-bold text-white tracking-tight">
            {branding.entityName || "AVIA V2"}
          </span>
        </motion.div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="space-y-4"
        >
          {title && (
            <h1 className="text-4xl font-bold text-white leading-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-white/80 text-lg max-w-md leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </motion.div>

        {/* Footer */}
        <div className="text-white/60 text-sm">
          © 2026 AVIA. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

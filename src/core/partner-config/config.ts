/**
 * Partner Configuration Loader - Multi-Partner Support
 */

import type { EntityBranding } from '../theme/ThemeContext';

/**
 * Type pour la config des features
 */
export interface FeaturesConfig {
  showStructures: boolean;
  showAgences: boolean;
  showCaisses: boolean;
  showProduits: boolean;
  showPackages: boolean;
  showEnsembleAutonome: boolean;
  showUtilisateurs: boolean;
  showParametres: boolean;
  showDashboard: boolean;
  showPartenaires: boolean;
  showTracking?: boolean;
}

/**
 * Détermine le partner ID avec priorités:
 * 1. Variable d'environnement VITE_PARTNER_ID
 * 2. URL query param ?partner=xxx
 * 3. Fallback à 'default'
 */
function getPartnerIdFromEnv(): string {
  // Check environment variable
  const envPartnerId = import.meta.env.VITE_PARTNER_ID;
  if (envPartnerId) return envPartnerId;

  // Check URL query param
  if (globalThis.window !== undefined) {
    const params = new URLSearchParams(globalThis.window.location.search);
    const queryPartnerId = params.get('partner');
    if (queryPartnerId) return queryPartnerId;
  }

  return 'default';
}

/**
 * Charge la config du partenaire depuis JSON
 * Avec fallback à default si non trouvée
 */
async function loadPartnerConfig(partnerId?: string): Promise<{ features: FeaturesConfig; branding: EntityBranding }> {
  const id = partnerId || getPartnerIdFromEnv();

  try {
    const response = await fetch(`/partners/structures/${id}.config.json`);
    if (!response.ok) {
      throw new Error(`Config not found for partner: ${id}`);
    }

    const config = await response.json();
    return {
      features: config.features,
      branding: config.branding,
    };
  } catch (error) {
    console.warn(
      `[PartnerConfig] Failed to load config for ${id}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Fallback à default
    try {
      const response = await fetch(`/partners/structures/default.config.json`);
      if (!response.ok) throw new Error('Default config not found');

      const config = await response.json();
      return {
        features: config.features,
        branding: config.branding,
      };
    } catch {
      console.error('[PartnerConfig] CRITICAL: Even default.config.json failed to load!');
      throw new Error('Cannot load configuration. Check that /partners/structures/default.config.json exists and is valid JSON.');
    }
  }
}

type PartnerConfigState = {
  featureFlags?: FeaturesConfig;
  partnerBranding?: EntityBranding;
};

const partnerConfigState: PartnerConfigState = {};

let originalFeatureFlags: FeaturesConfig | undefined;
let originalPartnerBranding: EntityBranding | undefined;

/**
 * Variables globales pour les flags et branding (mutables au runtime)
 * Initialisées comme undefined jusqu'au chargement depuis JSON
 * CRITIQUE : initializePartnerConfig() DOIT être appelée dans main.tsx avant le rendu
 */
export const getFeatureFlagsState = (): FeaturesConfig | undefined => partnerConfigState.featureFlags;

export const getPartnerBranding = (): EntityBranding | undefined => partnerConfigState.partnerBranding;

/**
 * Initialise les flags et branding au démarrage
 * Doit être appelé dans main.tsx avant le rendu React
 */
export async function initializeFeatureFlags(partnerId?: string): Promise<void> {
  try {
    const config = await loadPartnerConfig(partnerId);
    partnerConfigState.featureFlags = config.features;
    partnerConfigState.partnerBranding = config.branding;
    originalFeatureFlags = config.features;
    originalPartnerBranding = config.branding;
  } catch (error) {
    console.error('[PartnerConfig] CRITICAL: Initialization failed:', error);
    throw new Error('Failed to initialize partner configuration. App cannot start.');
  }
}

/**
 * Met à jour dynamiquement les drapeaux de fonctionnalités
 */
export function updateFeatureFlags(features: Partial<FeaturesConfig>): void {
  partnerConfigState.featureFlags = {
    ...partnerConfigState.featureFlags,
    ...features,
  } as FeaturesConfig;
}

/**
 * Réinitialise les drapeaux de fonctionnalités vers les originaux
 */
export function resetFeatureFlags(): void {
  if (originalFeatureFlags) {
    partnerConfigState.featureFlags = { ...originalFeatureFlags };
  }
}

export type FeatureFlagKey = keyof FeaturesConfig;

/**
 * Accède à une feature flag
 * Vérifie que featureFlags est initialisé
 * @param flag - Clé du flag à récupérer
 * @returns Valeur du flag (boolean ou number)
 * @throws Erreur si featureFlags n'est pas initialisé
 */
export function getFeatureFlag(flag: FeatureFlagKey): boolean | number {
  const featureFlags = getFeatureFlagsState();
  if (!featureFlags) {
    throw new Error(
      '[getFeatureFlag] featureFlags is not initialized. ' +
      'Did you call initializeFeatureFlags() in main.tsx before rendering?'
    );
  }
  const value = featureFlags[flag];
  if (value === undefined) {
    if (flag === "showTracking") {
      return true;
    }
    return false;
  }
  return value;
}

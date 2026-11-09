/** Sous-onglet d'un module de Paramètres (liste déroulante de l'onglet et titre de la section). */
export interface SubTabItem {
  value: string;
  label: string;
}

/** Sous-onglets visibles d'un module et celui ouvert par défaut. */
export interface SubTabsDefinition {
  items: SubTabItem[];
  defaultValue: string;
}

/** Props communes d'un module pilotable depuis Paramètres. */
export interface ControlledSubTabProps {
  /** Sous-onglet imposé par Paramètres. */
  subTab?: string;
  /** Changement de sous-onglet (y compris décidé par le module lui-même). */
  onSubTabChange?: (value: string) => void;
  /** Masque la barre de sous-onglets du module (navigation portée par Paramètres). */
  hideSubTabNav?: boolean;
}

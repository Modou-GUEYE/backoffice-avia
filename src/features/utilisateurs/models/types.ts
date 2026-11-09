// ===== TYPES DE ROLES UTILISATEUR (CORRESPONDANCE DEPUIS PARAMETRES) =====
// Ces roles representent les roles possibles qu'un utilisateur peut avoir dans le systeme
// Correspondance depuis les roles specifiques a chaque entite definis dans parametres/types.ts

export type UserRole = string;

export type UserStatus = "Actif" | "Inactif";

// ===== CONTEXTE UTILISATEUR (Entite + Correspondance de role) =====
export type UserEntityContext = 
  | "Administration" 
  | "Structure" 
  | "Agence" 
  | "Produit" 
  | "Distributeur"
  | "Partenaire";

// ===== MODELES UTILISATEUR =====
export interface Utilisateur {
  id: string;
  code: string;
  username?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  matricule?: string;
  role: UserRole;
  structure: string;
  agence?: string;
  agenceId?: string;
  caisse?: string;
  caisseId?: string;
  distributorId?: string;
  statut: UserStatus;
  dateCreation: string;
}

export interface UtilisateurForm {
  username: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  matricule?: string;
  role: UserRole;
  structure: string;
  agence?: string;
  agenceId?: string;
  /** Création : agences de rattachement (vide = siège, accès à toutes les agences du périmètre). */
  agenceIds?: string[];
  caisse?: string;
  caisseId?: string;
  distributorId?: string;
  statut: UserStatus;
}

// ===== UTILISATEUR AVEC CONTEXTE (Validation des roles par entite) =====
export interface UtilisateurWithContext extends Utilisateur {
  // Le contexte d'entite aide a valider quels roles sont autorises
  entityContext: UserEntityContext;
}

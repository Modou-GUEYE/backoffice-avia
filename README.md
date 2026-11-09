# Back-office AVIA

Back-office web d'une plateforme de gestion financière multi-structures : structures, agences, caisses, utilisateurs et habilitations, produits, partenaires, abonnements, tableau de bord, relevés et workflows d'intégration.

Application front-end uniquement : elle consomme des API REST via une passerelle.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui (Radix UI)
- Zustand pour l'état, React Hook Form pour les formulaires
- Vitest et Testing Library pour les tests

## Architecture

Organisation par fonctionnalité dans `src/features/<feature>`, selon le motif MVVM :

- `models/` : types et validation
- `services/` : appels API
- `viewmodels/` : logique (hooks)
- `views/` : composants d'affichage

Le code transverse est dans `src/core` (sécurité, réseau, thème, configuration), `src/shared` et `src/components`.

Points notables :
- Habilitations et périmètre déduits du jeton d'authentification (profils, structures, agences, caisses).
- Thème et libellés configurables par structure (`public/partners/structures/*.config.json`).
- Création d'opérations par import OpenAPI et configuration guidée des étapes de workflow.

## Démarrage

```bash
npm install
npm run dev
```

Le serveur de développement proxifie les appels `/api` vers `http://localhost:9080` (voir `vite.config.ts`). Une passerelle compatible doit donc tourner à cette adresse, ou l'URL est à adapter.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires |

## Docker

Un `Dockerfile` (build puis service via Nginx) est fourni.

## Données

Les noms de structures, de produits et les adresses e-mail des tests sont fictifs.

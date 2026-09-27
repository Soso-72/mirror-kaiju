# Cahier des Charges & Feuille de Route (Roadmap)

Ce document récapitule les objectifs du projet, la répartition technique et la feuille de route pour le développement du backend et du frontend.

---

## Présentation du Projet

Le projet consiste à développer une application web de gestion de ressources en temps réel réparties par secteurs (districts).

L'application permet :
1. Aux utilisateurs de s'authentifier de manière sécurisée.
2. De consulter la disponibilité des ressources par secteur.
3. De réaliser des transactions (demandes d'échange ou de transfert de ressources).
4. De suivre le transit (acheminement et logistique) de ces ressources.
5. De synchroniser toutes ces actions en temps réel auprès de tous les utilisateurs connectés.

---

## Stack Technique Retenue

* Frontend : Next.js (React), Tailwind CSS, Axios, Socket.IO Client.
* Backend : Node.js, Express, Socket.IO, JWT, bcrypt, CORS, dotenv.
* Base de Données : PostgreSQL avec Prisma 6 (ORM).

---

## Ce Qu'il Faut Faire (Roadmap / Liste des Tâches)

### 1. Base de Données & Modélisation (Prisma & PostgreSQL)
- Configurer le schéma Prisma (`schema.prisma`) avec les modèles :
  - User (id, email, password, role, districtId)
  - District / Resource (gestion des stocks par secteur)
  - Transaction (id, senderId, receiverId, status, items, timestamps)
  - Transit (id, transactionId, status, departureTime, arrivalTime)
  - DisasterState (id, level)
- Exécuter les migrations Prisma (`npx prisma migrate dev`).

---

### 2. Backend & API REST (Express)
- Module Authentification
  - Route `POST /api/auth/login` : Hachage des mots de passe avec `bcrypt`, vérification et génération du jeton `JWT`.
  - Middleware d'authentification pour sécuriser les routes privées.
- Module Ressources
  - Route `GET /api/resources/district` : Lecture des stocks de ressources par quartier via Prisma.
- Module Transactions
  - Route `POST /api/transactions` : Création d'une demande de transfert.
  - Route `PUT /api/transactions/:id/accept` : Validation de l'échange et mise à jour des stocks.
  - Route `PUT /api/transactions/:id/refuse` : Refus de la transaction.
- Module Transit
  - Route `POST /api/transit` : Création d'un ordre de transport logistique.
  - Route `PUT /api/transit/:id/accept` : Validation du démarrage du transit.
  - Route `PUT /api/transit/:id/refuse` : Annulation du transit.

---

### 3. Temps Réel (Socket.IO Server & Client)
- Configurer le serveur Socket.IO sur le backend Express.
- Émettre des événements lors des modifications critiques (ex: `transaction:accepted`, `transit:updated`, `disaster:level_changed`).
- Connecter le client Socket.IO dans Next.js pour mettre à jour l'interface automatiquement sans rechargement de page.

---

### 4. Frontend (Next.js & Tailwind CSS)
- Page de Connexion : Formulaire d'authentification lié à `POST /api/auth/login`.
- Tableau de Bord / Carte des Districts : Visualisation des ressources par secteur (`GET /api/resources/district`).
- Gestion des Demandes (Transactions) :
  - Formulaire pour faire une demande de transfert.
  - Interface de validation/refus des demandes reçues.
- Suivi Logistique (Transit) : Interface de suivi et de validation des trajets de ressources.
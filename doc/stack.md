# Documentation du Projet : Stack Technique & Architecture

Ce document présente les choix techniques du projet ainsi que son fonctionnement global, expliqués de manière simple et directe.

---

## La Stack Technique

### Frontend (Ce qui tourne dans le navigateur)

L'interface est conçue pour être rapide, réactive et agréable à utiliser.

* **Next.js & React** : Servent de squelette à l'application. Ils permettent de structurer l'interface sous forme de composants réutilisables et d'optimiser le chargement des pages.
* **Tailwind CSS** : Utilisé pour la mise en page et le design. Il permet de construire une interface propre et adaptative directement dans le code.
* **Axios** : Gère la communication avec le serveur pour envoyer et récupérer les données classiques (formulaires, chargement de listes, etc.).
* **Socket.IO Client** : Assure la connexion en direct avec le serveur. C'est ce qui permet de mettre à jour l'écran instantanément dès qu'une action se produit, sans rafraîchir la page.

---

### Backend (Le serveur et la logique)

Le backend gère la sécurité, les règles métier et la communication en direct.

* **Node.js & Express** : Reçoivent et traitent les requêtes venant du navigateur. Express sert de chef d'orchestre pour organiser les différentes routes de l'API.
* **Socket.IO** : Gère la communication temps réel côté serveur. Il maintient le lien ouvert avec les utilisateurs pour leur pousser les informations en direct.
* **jsonwebtoken (JWT)** : Sert à identifier les utilisateurs connectés à chaque requête grâce à un jeton sécurisé.
* **bcrypt** : Assure la sécurité des mots de passe en les chiffrant de manière irréversible avant leur enregistrement.
* **CORS & dotenv** : Le premier sécurise les accès en définissant quels domaines ont le droit d'appeler l'API, le second protège les variables de configuration et les clés secrètes.

---

### Base de Données

Les données sont structurées et conservées de façon fiable.

* **PostgreSQL** : La base de données relationnelle qui stocke l'ensemble des informations du système (utilisateurs, ressources, transactions).
* **Prisma 6** : Fait le lien entre le code JavaScript et la base de données. Il permet de lire, écrire et faire évoluer les données de manière fluide et sécurisée.

---

## Fonctionnement Global
# Directives de Développement & Règles (Kaiju Response Platform)

Ce document récapitule l'ensemble des règles fonctionnelles du système Kaiju ainsi que les normes techniques, la cartographie des erreurs applicatives et l'architecture logicielle pour l'API.

---

## 1. Topologie de la Ville (Tokyork)

Tokyork est divisée en 5 quartiers articulés autour d'un hub central (Xeno) et bordés à l'est et au sud par la baie de Tokyork :

| Code | Quartier | Accès à la Mer | Description |
| :--- | :--- | :--- | :--- |
| **A** | Apex | Enclavé (Landlocked) | Dépend entièrement des corridors terrestres. |
| **E** | Echo | Accès Baie | Accessible par la mer et par voie terrestre. |
| **W** | Warden | Enclavé (Landlocked) | Dépend entièrement des corridors terrestres. |
| **X** | Xeno | Accès Baie (Hub central) | Carrefour connecté à tous les autres quartiers et à la mer. |
| **Z** | Zion | Accès Baie | Accessible par la mer et par voie terrestre. |

### Matrice d'Adjacence Officielle

| | Apex (A) | Echo (E) | Warden (W) | Xeno (X) | Zion (Z) | Voie Maritime |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Apex (A)** | — | Oui | Oui | Oui | Non | Non |
| **Echo (E)** | Oui | — | Non | Oui | Non | Oui |
| **Warden (W)**| Oui | Non | — | Oui | Oui | Non |
| **Xeno (X)** | Oui | Oui | Oui | — | Oui | Oui |
| **Zion (Z)** | Non | Non | Oui | Oui | — | Oui |

### Adjacence & Voies de Transit
* **Adjacences Terrestres :**
  * Apex (A) est adjacent à Xeno (X) et Warden (W).
  * Warden (W) est adjacent à Apex (A), Xeno (X) et Zion (Z).
  * Echo (E) est adjacent à Xeno (X).
  * Zion (Z) est adjacent à Warden (W) et Xeno (X).
  * Xeno (X) est adjacent à tous les quartiers (A, E, W, Z) et à la mer.
* **Transfert direct :** Autorisé uniquement entre quartiers adjacents.
* **Transit :** Un transfert entre quartiers non adjacents nécessite le transit par un quartier intermédiaire (avec l'approbation explicite de ce dernier).
* **Voie Maritime :** Disponible uniquement pour Echo, Xeno et Zion. Elle offre une capacité supérieure mais double le temps de livraison.

---

## 2. Rôles et Officiers (RBAC)

Trois rôles d'officiers gèrent la plateforme avec des niveaux d'autorité distincts :

| Rôle | Portée | Responsabilités |
| :--- | :--- | :--- |
| **Quarter Coordinator (QC)** | Quartier unique | Gère ses propres ressources, approuve/refuse les demandes entrantes, initie des demandes vers les quartiers adjacents. |
| **Logistics Coordinator (LC)** | Multi-quartiers | Organise les transferts et chaînes de transit entre quartiers non adjacents. Ne peut pas forcer un transfert sans l'accord du QC. |
| **City Director (CD)** | Toute la ville | Autorité totale. Peut réquisitionner des ressources et est le seul rôle habilité à baisser le seuil de rétention. |

---

## 3. Niveaux de Catastrophe & Matrice de Permissions

Le niveau de catastrophe global (1 à 5) détermine les actions autorisées pour chaque rôle.

### Description des Niveaux
* **Niveau 1 (Watch) :** Phase de surveillance. Aucune réservation autorisée, les ressources restent sur place.
* **Niveau 2 (Alert) :** Réserves autorisées uniquement au sein de son propre quartier. Aucun transfert inter-quartier.
* **Niveau 3 (Emergency) :** Transferts autorisés entre quartiers adjacents (approbation QC requise).
* **Niveau 4 (Critical) :** Transferts étendus autorisés (adjacents + transit). Le LC peut initier des chaînes de transit. Le CD peut réquisitionner.
* **Niveau 5 (Catastrophic) :** Tous les transferts sont débloqués. Le CD peut réduire le seuil de rétention à $15\%$. La voie maritime est priorisée.

### Matrice des Permissions (Action x Niveau x Rôle)

| Action | Niv. 1 | Niv. 2 | Niv. 3 | Niv. 4 | Niv. 5 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Consulter les ressources** | Tous | Tous | Tous | Tous | Tous |
| **Réserver dans son quartier** | — | QC | QC | QC | QC |
| **Demander un transfert adjacent** | — | — | QC | QC, LC | Tous |
| **Organiser un transit** | — | — | — | LC | LC, CD |
| **Réquisitionner** | — | — | — | CD | CD |
| **Abaisser le seuil de rétention**| — | — | — | — | CD |

*Légende : QC = Quarter Coordinator, LC = Logistics Coordinator, CD = City Director, Tous = Tout utilisateur authentifié, "—" = Action interdite.*

---

## 4. Règle du Seuil de Rétention (Retention Threshold)

* **Règle par défaut ($30\%$) :** Chaque quartier doit conserver en permanence au moins $30\%$ (arrondi à l'entier supérieur $\lceil n \cdot 0.30 \rceil$) de son stock initial pour chaque ressource.
* **Exception ($15\%$) :** Seul le City Director (CD) peut abaisser ce seuil à $15\%$ ($\lceil n \cdot 0.15 \rceil$) uniquement au Niveau 5 (Catastrophique).
* **Validation Backend :** Aucune opération ne doit être ajustée automatiquement. Toute tentative de transfert qui ferait passer le stock d'un quartier sous son seuil de rétention minimal actif doit être strictement **rejetée**.

---

## 5. Ordre de Priorité de Résolution des Demandes

Pour traiter une demande de ressource effectuée par un quartier, le serveur applique strictement l'ordre d'évaluation suivant :

1. **Priorité aux quartiers adjacents :** Les quartiers immédiatement adjacents possédant un surplus (au-delà de leur seuil de rétention) sont sollicités en premier.
2. **Quartiers non adjacents :** Un quartier non adjacent ne peut fournir la ressource que si **aucun** quartier adjacent ne dispose du surplus nécessaire.
3. **Approbation de transit :** Tout transit par un quartier intermédiaire nécessite la validation explicite du QC de ce quartier et ajoute un délai opérationnel.
4. **Option maritime :** La voie maritime (Echo, Xeno, Zion) est une alternative utilisable avec un délai doublé.
5. **Priorité de Xeno :** Les demandes transitant par Xeno sont traitées **après** la satisfaction des besoins propres de Xeno.

---

## 6. Normes Techniques & Codes de Statut HTTP

### Table d'Atribution des Codes HTTP

| Code | Status | Cas d'Usage Métier (Kaiju Platform) |
| :--- | :--- | :--- |
| **200** | OK | Requête traitée avec succès (ex: consultation des ressources, mise à jour de statut). |
| **201** | Created | Création réussie d'une demande de transaction ou d'un ordre de transit. |
| **400** | Bad Request | Syntaxe invalide ou violation d'une règle métier (ex: adjacence, rétention, priorité). |
| **401** | Unauthorized | Absence de jeton JWT ou jeton expiré/invalide lors de l'appel à l'API. |
| **403** | Forbidden | Action non autorisée selon le niveau de catastrophe ou le rôle (ex: QC organisant un transit au niveau 3). |
| **404** | Not Found | Quartier, ressource, transaction ou route d'API introuvable. |
| **409** | Conflict | Conflit d'état ou refus explicite (ex: refus de transit par un quartier intermédiaire). |
| **500** | Internal Server Error | Erreur interne du serveur ou échec lors de la requête en base de données. |

---

## 7. Table Explicite des Erreurs Métier

Conformément au cahier des charges, le serveur doit rejeter toute requête invalide en renvoyant un code HTTP adapté, un code d'erreur applicatif univoque et un message explicite.

| Règle Violée | Code Erreur Métier | Statut HTTP | Cause et Condition de Rejet | Exemple de Message Explicite |
| :--- | :--- | :---: | :--- | :--- |
| **Violation d'adjacence** | `ERR_ADJACENCY_VIOLATION` | **400** | Demande de transfert direct entre deux quartiers non adjacents sans passer par un transit. | *"Transfert direct impossible : les quartiers Apex et Zion ne sont pas adjacents. Un transit par Warden ou Xeno est requis."* |
| **Violation de rétention** | `ERR_RETENTION_THRESHOLD_VIOLATION` | **400** | La quantité demandée ferait passer le stock restant du quartier émetteur sous son seuil minimal ($30\%$ ou $15\%$). | *"Stock insuffisant : le quartier Echo doit conserver au moins 3 unités de cette ressource (seuil de rétention de 30%)."* |
| **Ordre de priorité non respecté** | `ERR_PRIORITY_ORDER_VIOLATION` | **400** | Tentative de solliciter un quartier non adjacent alors qu'un quartier adjacent possède le surplus requis. | *"Priorité non respectée : un quartier adjacent dispose du surplus nécessaire pour répondre à cette demande."* |
| **Violation de permission / rôle** | `ERR_PERMISSION_DENIED` | **403** | L'utilisateur tente une action non autorisée pour son rôle ou hors de son périmètre géographique. | *"Action refusée : le rôle Quarter Coordinator ne peut pas organiser de chaîne de transit multi-quartiers."* |
| **Niveau de catastrophe insuffisant** | `ERR_CATASTROPHE_LEVEL_LOW` | **403** | L'action demandée nécessite un niveau de catastrophe plus élevé que le niveau actuel de la ville. | *"Niveau de catastrophe insuffisant : le niveau 3 (Emergency) minimum est requis pour autoriser les transferts inter-quartiers."* |
| **Refus de transit par intermédiaire** | `ERR_TRANSIT_REFUSED` | **409** | Le quartier intermédiaire a décliné la demande de transit de ressources sur son territoire. | *"Transit rejeté : le quartier Xeno a refusé de servir d'intermédiaire pour ce convoi."* |
| **Authentification requise** | `ERR_UNAUTHORIZED` | **401** | Jeton JWT manquant, invalide ou expiré lors de l'appel de l'API. | *"Authentification requise : veuillez vous connecter pour effectuer cette opération."* |
| **Ressource / Quartier inexistant** | `ERR_NOT_FOUND` | **404** | L'identifiant du quartier, de la ressource ou de la transaction n'existe pas en base. | *"Entité introuvable : l'identifiant de transaction spécifié est invalide."* |
| **Conflit d'état ou concurrence** | `ERR_RESOURCE_CONFLICT` | **409** | Deux équipes tentent d'allouer simultanément la même ressource déjà réservée. | *"Conflit d'allocation : la ressource demandée vient d'être réservée par une autre équipe."* |

---

## 8. Format JSON Standardisé des Réponses API

### Format Succès
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_987654",
    "status": "APPROVED",
    "fromDistrict": "Apex",
    "toDistrict": "Warden",
    "resource": "Personnel médical",
    "amount": 2
  }
}
```

### Format Erreur
```json
{
  "success": false,
  "error": {
    "code": "ERR_RETENTION_THRESHOLD_VIOLATION",
    "message": "Stock insuffisant : le quartier Echo doit conserver au moins 3 unités de cette ressource (seuil de rétention de 30%).",
    "details": {
      "district": "Echo",
      "resource": "Personnel médical",
      "currentStock": 5,
      "requestedAmount": 3,
      "minRetention": 3
    }
  }
}
```

---

## 9. Architecture d'Implémentation Côté Serveur (Node.js & Express)

### Classe d'Erreur Personnalisée (`KaijuError.js`)

```javascript
class KaijuError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = KaijuError;
```

### Middleware Global de Gestion des Erreurs (`errorHandler.js`)

```javascript
const errorHandler = (err, req, res, next) => {
  if (err instanceof KaijuError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  console.error("Uncaught Server Error:", err);
  return res.status(500).json({
    success: false,
    error: {
      code: "ERR_INTERNAL_SERVER_ERROR",
      message: "Une erreur interne est survenue lors du traitement de la requête."
    }
  });
};

module.exports = errorHandler;
```

### Exemple de Contrôleur de Transfert (`transferController.js`)

```javascript
const KaijuError = require('../errors/KaijuError');

async function processTransferRequest(req, res, next) {
  try {
    const { fromDistrict, toDistrict, resourceId, amount } = req.body;
    const user = req.user;

    // 1. Vérification d'adjacence
    if (!isAdjacent(fromDistrict, toDistrict)) {
      throw new KaijuError(
        'ERR_ADJACENCY_VIOLATION',
        `Transfert direct impossible : les quartiers ${fromDistrict} et ${toDistrict} ne sont pas adjacents. Un transit est requis.`,
        400,
        { fromDistrict, toDistrict }
      );
    }

    // 2. Vérification du Seuil de Rétention
    const { currentStock, initialStock, isLevel5, isRetentionLowered } = await getStockInfo(fromDistrict, resourceId);
    const retentionFactor = (isLevel5 && isRetentionLowered) ? 0.15 : 0.30;
    const minRetention = Math.ceil(initialStock * retentionFactor);

    if (currentStock - amount < minRetention) {
      throw new KaijuError(
        'ERR_RETENTION_THRESHOLD_VIOLATION',
        `Stock insuffisant : le quartier ${fromDistrict} doit conserver au moins ${minRetention} unités (seuil de rétention de ${retentionFactor * 100}%).`,
        400,
        { district: fromDistrict, currentStock, requestedAmount: amount, minRetention }
      );
    }

    res.status(201).json({ success: true, message: "Demande enregistrée." });
  } catch (error) {
    next(error);
  }
}
```
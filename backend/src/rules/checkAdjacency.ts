import { RuleValidationError } from "../rules/checkPermissions.js";
import { prisma } from "../config/prisma.js";

// Liste des quartiers enclavés (aucun accès maritime)
const LANDLOCKED_DISTRICTS = ["Apex", "Warden"];

export interface CheckAdjacencyParams {
  sourceDistrictId: number | string;
  destinationDistrictId: number | string;
  transitDistrictId?: number | string | null;
  isMaritime?: boolean;
}

/**
 * Recherche un quartier soit par son ID numérique, soit par son nom (ex: "Apex").
 * Permet d'éviter les erreurs Prisma lors de la réception de chaînes de caractères au lieu d'entiers.
 */
async function getDistrict(identifier: number | string | null | undefined) {
  if (identifier === null || identifier === undefined) {
    return null;
  }

  // 1. Si c'est un nombre ou une chaîne convertible en nombre pur (ex: 1 ou "1")
  if (typeof identifier === "number" || (!isNaN(Number(identifier)) && !isNaN(parseInt(String(identifier), 10)))) {
    const numId = Number(identifier);
    const districtById = await prisma.district.findUnique({
      where: { id: numId },
    });
    if (districtById) return districtById;
  }

  // 2. Si c'est une chaîne de caractères (nom du quartier, ex: "Apex")
  const strIdentifier = String(identifier).trim();
  return await prisma.district.findFirst({
    where: { name: strIdentifier },
  });
}

/**
 * Vérifie les contraintes de topologie, d'adjacence et de voies maritimes
 * conformément au cahier des charges.
 */
export async function checkAdjacency({
  sourceDistrictId,
  destinationDistrictId,
  transitDistrictId,
  isMaritime = false,
}: CheckAdjacencyParams): Promise<void> {

  // 1. Charger et résoudre les entités quartiers depuis la base de données
  const sourceDistrict = await getDistrict(sourceDistrictId);
  const destDistrict = await getDistrict(destinationDistrictId);

  if (!sourceDistrict || !destDistrict) {
    throw new RuleValidationError(
      "Le quartier source ou destination est introuvable.",
      404,
      "NOT_FOUND"
    );
  }

  const srcId = sourceDistrict.id;
  const dstId = destDistrict.id;

  // 2. Gestion de la VOIE MARITIME
  if (isMaritime) {
    // Vérification : La voie maritime n'est pas disponible pour les quartiers enclavés
    if (LANDLOCKED_DISTRICTS.includes(sourceDistrict.name)) {
      throw new RuleValidationError(
        `La voie maritime n'est pas disponible pour le quartier ${sourceDistrict.name} (enclavé).`,
        422,
        "MARITIME_ROUTE_UNAVAILABLE"
      );
    }

    if (LANDLOCKED_DISTRICTS.includes(destDistrict.name)) {
      throw new RuleValidationError(
        `La voie maritime n'est pas disponible pour le quartier ${destDistrict.name} (enclavé).`,
        422,
        "MARITIME_ROUTE_UNAVAILABLE"
      );
    }

    // Vérification de la liaison maritime effective
    const maritimeAdjacency = await prisma.districtAdjacency.findFirst({
      where: {
        districtId: srcId,
        adjacentDistrictId: dstId,
        routeType: "maritime",
      },
    });

    if (!maritimeAdjacency) {
      throw new RuleValidationError(
        `Aucune liaison maritime directe entre ${sourceDistrict.name} et ${destDistrict.name}.`,
        422,
        "MARITIME_ROUTE_UNAVAILABLE"
      );
    }

    return; // Route maritime valide !
  }

  // 3. Gestion des ROUTES TERRESTRES

  // Cas A : Transfert direct demandé (sans quartier de transit)
  if (!transitDistrictId) {
    const directAdjacency = await prisma.districtAdjacency.findFirst({
      where: {
        districtId: srcId,
        adjacentDistrictId: dstId,
        routeType: "adjacent",
      },
    });

    // Si pas d'adjacence terrestre directe -> Violation
    if (!directAdjacency) {
      throw new RuleValidationError(
        `Aucune adjacence directe entre ${sourceDistrict.name} et ${destDistrict.name}: un transit est requis.`,
        422,
        "ADJACENCY_VIOLATION"
      );
    }

    return; // Adjacence directe valide !
  }

  // Cas B : Transfert avec TRANSIT par un quartier intermédiaire
  const transitDistrict = await getDistrict(transitDistrictId);

  if (!transitDistrict) {
    throw new RuleValidationError(
      "Le quartier de transit spécifié est introuvable.",
      404,
      "NOT_FOUND"
    );
  }

  const trnId = transitDistrict.id;

  // Le quartier de transit ne doit pas être la source ou la destination
  if (trnId === srcId || trnId === dstId) {
    throw new RuleValidationError(
      "Le quartier de transit doit être un quartier distinct du quartier source et destination.",
      400,
      "VALIDATION_ERROR"
    );
  }

  // Vérifier la liaison 1 : Source <-> Transit
  const sourceToTransit = await prisma.districtAdjacency.findFirst({
    where: {
      districtId: srcId,
      adjacentDistrictId: trnId,
      routeType: "adjacent",
    },
  });

  if (!sourceToTransit) {
    throw new RuleValidationError(
      `Le quartier de transit ${transitDistrict.name} n'est pas adjacent au quartier source ${sourceDistrict.name}.`,
      422,
      "ADJACENCY_VIOLATION"
    );
  }

  // Vérifier la liaison 2 : Transit <-> Destination
  const transitToDest = await prisma.districtAdjacency.findFirst({
    where: {
      districtId: trnId,
      adjacentDistrictId: dstId,
      routeType: "adjacent",
    },
  });

  if (!transitToDest) {
    throw new RuleValidationError(
      `Le quartier de transit ${transitDistrict.name} n'est pas adjacent au quartier destination ${destDistrict.name}.`,
      422,
      "ADJACENCY_VIOLATION"
    );
  }
}
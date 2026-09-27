// import { prisma } from "../../config/prisma.js";
// import { RuleValidationError } from "../../rules/checkPermissions.js";

// export type ResolvedRoute =
//   | { type: "direct"; transitDistrictId: null; isMaritime: false }
//   | { type: "transit"; transitDistrictId: number; transitDistrictName: string; isMaritime: false }
//   | { type: "maritime"; transitDistrictId: null; isMaritime: true };

// async function getRoutes(a: number, b: number): Promise<("adjacent" | "maritime")[]> {
//   const routes = await prisma.districtAdjacency.findMany({
//     where: {
//       OR: [
//         { districtId: a, adjacentDistrictId: b },
//         { districtId: b, adjacentDistrictId: a },
//       ],
//     },
//   });
//   return [...new Set(routes.map((r) => r.routeType))] as ("adjacent" | "maritime")[];
// }

// /**
//  * Décide automatiquement la route, priorité : direct > transit terrestre > maritime.
//  */
// export async function resolveRoute(
//   sourceDistrictId: number,
//   destinationDistrictId: number
// ): Promise<ResolvedRoute> {
//   const directRoutes = await getRoutes(sourceDistrictId, destinationDistrictId);

//   if (directRoutes.includes("adjacent")) {
//     return { type: "direct", transitDistrictId: null, isMaritime: false };
//   }

//   const candidates = await prisma.district.findMany({
//     where: { id: { notIn: [sourceDistrictId, destinationDistrictId] } },
//   });

//   for (const candidate of candidates) {
//     const legA = await getRoutes(sourceDistrictId, candidate.id);
//     const legB = await getRoutes(candidate.id, destinationDistrictId);
//     if (legA.includes("adjacent") && legB.includes("adjacent")) {
//       return {
//         type: "transit",
//         transitDistrictId: candidate.id,
//         transitDistrictName: candidate.name,
//         isMaritime: false,
//       };
//     }
//   }

//   if (directRoutes.includes("maritime")) {
//     return { type: "maritime", transitDistrictId: null, isMaritime: true };
//   }

//   throw new RuleValidationError(
//     "Aucune route (terrestre directe, transit, ou maritime) n'existe entre ces deux quartiers.",
//     422,
//     "ADJACENCY_VIOLATION"
//   );
// }
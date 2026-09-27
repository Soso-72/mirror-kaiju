import { cw } from "../utils/controllerWrapper.js";
import { getDistrictResourcesForMap, requisitionResource, reserveResource, unreserveResource } from "../services/resourceService.js";


export const requisition = cw(async (req: any, res: any) => {
  const { sourceDistrictId, destinationDistrictId, resourceTypeId, quantity } = req.body ?? {};

  const result = await requisitionResource({
    sourceDistrictId: Number(sourceDistrictId),
    destinationDistrictId: destinationDistrictId ? Number(destinationDistrictId) : undefined,
    resourceTypeId: Number(resourceTypeId),
    quantity: Number(quantity),
    user: req.user,
  });

  return res.status(200).json({ success: true, response: result });
});


export const reserve = cw(async (req: any, res: any) => {
  const { districtId, resourceTypeId, quantity } = req.body ?? {};

  const updated = await reserveResource({
    districtId: Number(districtId),
    resourceTypeId: Number(resourceTypeId),
    quantity: Number(quantity),
    user: req.user,
  });

  return res.status(200).json({ success: true, response: updated });
});

export const unreserve = cw(async (req: any, res: any) => {
  const { districtId, resourceTypeId, quantity } = req.body ?? {};

  const updated = await unreserveResource({
    districtId: Number(districtId),
    resourceTypeId: Number(resourceTypeId),
    quantity: Number(quantity),
    user: req.user,
  });

  return res.status(200).json({ success: true, response: updated });
});


export const getResourcesMap = cw(async (_req: any, res: any) => {
  const districts = await getDistrictResourcesForMap();

  return res.status(200).json({
    success: true,
    response: districts,
  });
});

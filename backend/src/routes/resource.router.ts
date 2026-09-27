import express from "express";
import { authenticateToken } from "../midlewares/auth.midleware.js";
import { getResourcesMap, requisition, reserve, unreserve } from "../controllers/resource.controller.js";

const router = express.Router();

router.get("/resource/map", authenticateToken, getResourcesMap);
router.post("/resource/reserve", authenticateToken, reserve);
router.post("/resource/unreserve", authenticateToken, unreserve);
router.post("/resource/requisition", authenticateToken, requisition);

export default router;

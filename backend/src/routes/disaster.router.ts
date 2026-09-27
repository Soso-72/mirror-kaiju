import { Router } from "express";
import {
  updateDisasterLevelController,
  getDisasterLevelController,
} from "../controllers/disaster.controller.js";

const router = Router();

router.get("/disaster-level", getDisasterLevelController);
router.put("/disaster-level", updateDisasterLevelController);

export default router;
import { Router } from "express";
import { updateRetentionController } from "../controllers/retention.controller.js";
import { authenticateToken } from "../midlewares/auth.midleware.js";

const router = Router();

// POST /resource/retention/update
router.post("/retention/update", authenticateToken, updateRetentionController);

export default router;
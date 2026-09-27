import express from "express";
import { loginUser } from "../controllers/userAuth.controller.js";
import { getUserProfil } from "../controllers/profil.controller.js";
import { authenticateToken } from "../midlewares/auth.midleware.js";
import { cw } from "../utils/controllerWrapper.js";

const router = express.Router();

router.post("/user/login", cw(loginUser));
router.get("/user/profil", authenticateToken, cw(getUserProfil));

export default router;
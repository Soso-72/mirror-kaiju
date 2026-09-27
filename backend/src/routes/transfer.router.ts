import express from "express";
import { authenticateToken } from "../midlewares/auth.midleware.js";
import {
    createTransfer,
    getTransfer,
    approveTransfer,
    rejectTransfer,
    getRoutes,
    getTransfers,
} from "../controllers/transfer.controller.js";

const routerTransfer = express.Router();

// Public / Protégé selon tes besoins
routerTransfer.get("/transfer/all", authenticateToken, getTransfers);
routerTransfer.get("/transfer/routes", authenticateToken, getRoutes);
routerTransfer.get("/transfer/:id", authenticateToken, getTransfer);

// Protégé : Nécessite req.user pour identifier l'auteur ou le modérateur
routerTransfer.post("/transfer/create", authenticateToken, createTransfer);
routerTransfer.post("/transfer/:id/approve", authenticateToken, approveTransfer);
routerTransfer.post("/transfer/:id/reject", authenticateToken, rejectTransfer);

export default routerTransfer;
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.router.js";
import resourceRoutes from "./routes/resource.router.js";
import transferRoutes from "./routes/transfer.router.js";
import disaster from "./routes/disaster.router.js";
import retention from "./routes/retention.routes.js";
import { initSocket } from "./socket/io.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// 1. Définition de l'origine autorisée (React/Next.js)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// 2. Middleware CORS pour Express
app.use(cors({
  origin: true, // ou CLIENT_URL pour restreindre strictement
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Permet de lire du JSON dans le body des requêtes
app.use(express.json());

// 3. Création du serveur HTTP à partir de l'application Express
const server = http.createServer(app);

// 4. Initialisation de Socket.IO (centralisée dans socket/io.ts, pour que
//    les services puissent émettre des events sans dépendre de ce fichier)
initSocket(server, CLIENT_URL);

// Route de test API
app.get("/api", (req, res) => {
  res.json({ status: "ok", message: "Le backend fonctionne !" });
});

// Montage des routes Express
app.use(userRoutes);
app.use(resourceRoutes);
app.use(transferRoutes);
app.use(disaster);
app.use(retention);

// 5. Démarrage du serveur HTTP (server.listen à la place de app.listen)
server.listen(PORT, () => {
  console.log(`🚀 Serveur HTTP & WebSocket démarré sur http://localhost:${PORT}`);
});
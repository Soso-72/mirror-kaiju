import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server | null = null;

export function initSocket(server: HttpServer, clientUrl: string): Server {
  io = new Server(server, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Client connecté via WebSocket : ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`❌ Client déconnecté : ${socket.id}`);
    });
  });

  return io;
}

function getIo(): Server {
  if (!io) {
    throw new Error("Socket.IO n'a pas été initialisé. Appelez initSocket() avant.");
  }
  return io;
}

export function emitStockUpdated(payload: {
  districtId: number;
  districtName?: string;
  resourceTypeId: number;
  resourceTypeName?: string;
  quantity: number;
}) {
  getIo().emit("stock:updated", payload);
}

export function emitConflictDetected(payload: {
  districtId: number;
  resourceTypeId: number;
  message: string;
  conflictingTransferIds: number[];
}) {
  getIo().emit("conflict:detected", payload);
}

export function emitDisasterLevelChanged(payload: {
  level: number;
  isRetentionOverrideActive: boolean;
}) {
  getIo().emit("disasterLevel:changed", payload);
}
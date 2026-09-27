import { io, Socket } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

/**
 * Renvoie une instance unique de connexion Socket.IO, partagée par
 * tous les composants qui en ont besoin (évite d'ouvrir une connexion
 * par composant).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}
import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { WsMessage } from "./types.js";

const clients = new Set<WebSocket>();

export function attachWs(server: Server, mode: "chain" | "mock"): void {
  const wss = new WebSocketServer({ server, path: "/ws/feed" });
  wss.on("connection", (socket) => {
    clients.add(socket);
    const hello: WsMessage = {
      type: "hello",
      payload: { mode, serverTimeIso: new Date().toISOString() },
    };
    socket.send(JSON.stringify(hello));
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });
}

export function broadcast(message: WsMessage): void {
  const data = JSON.stringify(message);
  for (const c of clients) {
    if (c.readyState === c.OPEN) {
      try {
        c.send(data);
      } catch {
        clients.delete(c);
      }
    }
  }
}

export function connectedCount(): number {
  return clients.size;
}

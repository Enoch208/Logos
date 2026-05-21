"use client";

import { useEffect, useRef, useState } from "react";
import { WS_URL, type WsMessage } from "@/lib/api";
import type { AgentTransaction } from "@/data/mockData";

type Status = "connecting" | "open" | "closed" | "fallback";

export function useLiveFeed(seed: AgentTransaction[], maxRows = 14) {
  const [rows, setRows] = useState<AgentTransaction[]>(seed);
  const [status, setStatus] = useState<Status>("connecting");
  const [mode, setMode] = useState<"chain" | "mock" | "client-mock">("mock");
  const wsRef = useRef<WebSocket | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startClientFallback = () => {
      if (fallbackRef.current) return;
      setStatus("fallback");
      setMode("client-mock");
      fallbackRef.current = setInterval(() => {
        if (cancelled) return;
        const base = seed[Math.floor(Math.random() * seed.length)];
        if (!base) return;
        const tx: AgentTransaction = {
          ...base,
          id: `0x${Math.random().toString(16).slice(2, 14)}...${Math.random()
            .toString(16)
            .slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        };
        setRows((prev) => [tx, ...prev].slice(0, maxRows));
      }, 2400);
    };

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      const failTimer = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startClientFallback();
        }
      }, 2500);

      ws.onopen = () => {
        clearTimeout(failTimer);
        if (cancelled) return;
        setStatus("open");
      };
      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          if (msg.type === "tx") {
            setRows((prev) => [msg.payload, ...prev].slice(0, maxRows));
          } else if (msg.type === "hello") {
            setMode(msg.payload.mode);
          }
        } catch {}
      };
      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        startClientFallback();
      };
      ws.onerror = () => {
        if (cancelled) return;
        ws.close();
      };
    } catch {
      startClientFallback();
    }

    return () => {
      cancelled = true;
      wsRef.current?.close();
      if (fallbackRef.current) clearInterval(fallbackRef.current);
    };
  }, [seed, maxRows]);

  return { rows, status, mode };
}

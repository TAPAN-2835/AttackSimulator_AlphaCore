"""
Simple WebSocket manager for broadcasting live simulation events.
Clients receive enriched events (user, channel, event_type, campaign) when they occur.
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class EventBroadcaster:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info("WebSocket client connected; total=%s", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    def has_connections(self) -> bool:
        return len(self._connections) > 0

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._connections:
            return
        msg = json.dumps(payload, default=str)
        dead = []
        for conn in self._connections:
            try:
                await conn.send_text(msg)
            except Exception as e:
                logger.warning("WebSocket send failed: %s", e)
                dead.append(conn)
        for c in dead:
            self.disconnect(c)


# Global broadcaster; set from main app so log_event can push
_event_broadcaster: EventBroadcaster | None = None


def get_broadcaster() -> EventBroadcaster:
    global _event_broadcaster
    if _event_broadcaster is None:
        _event_broadcaster = EventBroadcaster()
    return _event_broadcaster


def set_broadcaster(broadcaster: EventBroadcaster) -> None:
    global _event_broadcaster
    _event_broadcaster = broadcaster

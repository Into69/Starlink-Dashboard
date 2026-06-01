"""
WebSocket endpoint  /ws/live

On connect  → sends the current telemetry snapshot immediately.
On each 1-s status poll → pushes the new snapshot to every connected client.
On disconnect → silently unregisters the client.

The message shape matches the spec:
{
  "timestamp": 1234567890,
  "download_mbps": 187.4,
  "upload_mbps": 23.1,
  "latency_ms": 28,
  "drop_rate_pct": 0.4,
  "snr_above_floor": true,
  "uptime_s": 1234567,
  "dish_temp_c": 43,
  "is_obstructed": false,
  "alerts": []
}
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from dish import telemetry

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._active.add(ws)
        logger.info("WS client connected  (total: %d)", len(self._active))

    def disconnect(self, ws: WebSocket) -> None:
        self._active.discard(ws)
        logger.info("WS client disconnected (total: %d)", len(self._active))

    async def broadcast(self, data: dict) -> None:
        if not self._active:
            return
        payload = json.dumps(data)
        dead: list[WebSocket] = []
        for ws in list(self._active):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._active.discard(ws)


manager = ConnectionManager()


async def _on_telemetry_update(snapshot: dict) -> None:
    """Callback registered with the telemetry poller."""
    await manager.broadcast(snapshot)


# Register the broadcast callback once at module import time.
# telemetry.start_polling() is called from the lifespan, so the
# callback just sits dormant until the first snapshot arrives.
telemetry.register_ws_callback(_on_telemetry_update)


@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send whatever we have right now so the client isn't blank on load
        current = telemetry.get_current()
        if current:
            await websocket.send_text(json.dumps(current))

        # Keep the socket open; updates arrive via the broadcast callback.
        # We read from the client so we detect disconnects promptly.
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Nothing from client — send a keepalive ping
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WS connection closed: %s", exc)
    finally:
        manager.disconnect(websocket)

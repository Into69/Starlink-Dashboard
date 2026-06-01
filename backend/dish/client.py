"""
gRPC channel singleton with exponential backoff reconnection.
All dish modules import get_channel() to share a single connection.
"""

import asyncio
import logging
import time
from typing import Optional

import grpc

logger = logging.getLogger(__name__)

DISH_ADDRESS = "192.168.100.1:9200"
_MAX_BACKOFF = 60.0  # seconds


class DishClient:
    def __init__(self, address: str = DISH_ADDRESS):
        self.address = address
        self._channel: Optional[grpc.Channel] = None
        self._connected = False
        self._last_error: Optional[str] = None
        self._reconnect_attempt = 0
        self._lock = asyncio.Lock()

    def _make_channel(self) -> grpc.Channel:
        return grpc.insecure_channel(
            self.address,
            options=[
                ("grpc.keepalive_time_ms", 10_000),
                ("grpc.keepalive_timeout_ms", 5_000),
                ("grpc.keepalive_permit_without_calls", True),
                ("grpc.http2.max_pings_without_data", 0),
                ("grpc.connect_timeout_ms", 5_000),
            ],
        )

    def get_channel(self) -> grpc.Channel:
        """Return the current gRPC channel, creating it if needed."""
        if self._channel is None:
            self._channel = self._make_channel()
        return self._channel

    def probe(self) -> bool:
        """
        Synchronously check if the dish endpoint is reachable by attempting
        a channel connectivity check. Returns True if reachable.
        """
        try:
            channel = self._make_channel()
            future = grpc.channel_ready_future(channel)
            future.result(timeout=3)
            channel.close()
            self._connected = True
            self._last_error = None
            return True
        except grpc.FutureTimeoutError:
            self._connected = False
            self._last_error = f"Timeout connecting to {self.address}"
            return False
        except Exception as exc:
            self._connected = False
            self._last_error = str(exc)
            return False

    def reconnect(self) -> None:
        """Close and recreate the channel."""
        if self._channel is not None:
            try:
                self._channel.close()
            except Exception:
                pass
        self._channel = self._make_channel()
        logger.info("gRPC channel reconnected to %s", self.address)

    async def reconnect_with_backoff(self) -> None:
        """
        Keep trying to re-establish the gRPC channel using exponential backoff.
        Intended to be called from a background asyncio task after a failure.
        """
        while True:
            delay = min(2 ** self._reconnect_attempt, _MAX_BACKOFF)
            logger.warning(
                "Dish unreachable — retrying in %.0fs (attempt %d)",
                delay,
                self._reconnect_attempt + 1,
            )
            await asyncio.sleep(delay)
            self._reconnect_attempt += 1
            self.reconnect()
            if self.probe():
                logger.info("Reconnected to dish after %d attempt(s)", self._reconnect_attempt)
                self._reconnect_attempt = 0
                return

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    def update_address(self, address: str) -> None:
        """Change the target dish address and reconnect."""
        self.address = address
        self.reconnect()


# Module-level singleton — import this everywhere
dish_client = DishClient()

"""
WAN and WiFi details.

The Starlink dish itself does NOT expose WAN/DHCP data via its gRPC API —
that data lives on the Starlink mesh router (a separate device at a different
IP address). This module returns a best-effort response: if a Starlink router
is reachable at the configured address it will be queried via gRPC reflection;
otherwise an empty/null response is returned so the frontend degrades
gracefully.
"""

import logging
from typing import Optional

import grpc

logger = logging.getLogger(__name__)

ROUTER_ADDRESS = "192.168.1.1:9000"  # typical Starlink gen-2 router address


def get_wan_details(router_address: str = ROUTER_ADDRESS) -> dict:
    """
    Attempt to pull WAN/network info from a Starlink router.
    Returns a dict with keys: wan_ip, ipv6_address, dns_servers, nat_type, gateway.
    All values are None if the router is not reachable.
    """
    try:
        import yagrc.reflector as reflector

        with grpc.insecure_channel(router_address) as channel:
            future = grpc.channel_ready_future(channel)
            future.result(timeout=2)

            grclient = reflector.GrpcReflectionClient()
            grclient.load_protocols(channel, symbols=["SpaceX.API.Device.Device"])
            DeviceStub = grclient.service_stub_class("SpaceX.API.Device.Device")
            Request = grclient.message_class("SpaceX.API.Device.Request")

            stub = DeviceStub(channel)
            response = stub.Handle(Request(get_network_info={}), timeout=5)
            info = getattr(response, "get_network_info", None) or getattr(response, "wifi_get_status", None)

            if info is None:
                return _empty_wan()

            return {
                "wan_ip":       _str(getattr(info, "wan_ip_address", None)),
                "ipv6_address": _str(getattr(info, "ipv6_address", None)),
                "dns_servers":  list(getattr(info, "dns_servers", []) or []),
                "nat_type":     _str(getattr(info, "nat_type", None)),
                "gateway":      _str(getattr(info, "default_gateway", None)),
            }
    except Exception as exc:
        logger.debug("WAN details unavailable (no Starlink router?): %s", exc)
        return _empty_wan()


def _empty_wan() -> dict:
    return {
        "wan_ip":       None,
        "ipv6_address": None,
        "dns_servers":  [],
        "nat_type":     None,
        "gateway":      None,
    }


def _str(value) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None

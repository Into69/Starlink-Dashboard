"""
Connected device and DHCP lease data.

Like WAN details, this data lives on the Starlink router (not the dish).
Returns an empty list when the router is unreachable.
"""

import logging

import grpc

logger = logging.getLogger(__name__)

ROUTER_ADDRESS = "192.168.1.1:9000"


def get_connected_devices(router_address: str = ROUTER_ADDRESS) -> list[dict]:
    """
    Attempt to pull DHCP/client list from a Starlink router.
    Returns a list of device dicts with keys:
      hostname, mac, ip, band, signal_dbm, lease_expiry
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
            response = stub.Handle(Request(wifi_get_clients={}), timeout=5)
            clients_resp = getattr(response, "wifi_get_clients", None)

            if clients_resp is None:
                return []

            clients = getattr(clients_resp, "clients", []) or []
            return [_parse_client(c) for c in clients]

    except Exception as exc:
        logger.debug("Device list unavailable (no Starlink router?): %s", exc)
        return []


def _parse_client(client) -> dict:
    signal = getattr(client, "signal_strength", None)
    band_raw = getattr(client, "radio_id", None)
    band = _map_band(band_raw)
    lease = getattr(client, "lease_expiry_timestamp", None)

    return {
        "hostname":     _str(getattr(client, "name", None)) or "Unknown",
        "mac":          _str(getattr(client, "mac_address", None)),
        "ip":           _str(getattr(client, "ip", None)),
        "band":         band,
        "signal_dbm":   int(signal) if signal is not None else None,
        "lease_expiry": int(lease) if lease is not None else None,
    }


def _map_band(radio_id) -> str:
    if radio_id is None:
        return "unknown"
    rid = str(radio_id).upper()
    if "5" in rid:
        return "5GHz"
    if "2" in rid:
        return "2.4GHz"
    if "WIRED" in rid or "ETH" in rid:
        return "wired"
    return "unknown"


def _str(value) -> str:
    if value is None:
        return ""
    return str(value).strip()

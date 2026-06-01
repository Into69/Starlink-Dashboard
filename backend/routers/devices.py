from fastapi import APIRouter, Query
from dish.devices import get_connected_devices
from dish.wifi import get_wan_details

router = APIRouter()


@router.get("/devices")
def devices(router_address: str = Query(default="192.168.1.1:9000")):
    """Connected devices (DHCP clients) from the Starlink router."""
    return {
        "router_address": router_address,
        "devices": get_connected_devices(router_address=router_address),
    }


@router.get("/wan")
def wan(router_address: str = Query(default="192.168.1.1:9000")):
    """WAN / network details from the Starlink router."""
    return get_wan_details(router_address=router_address)

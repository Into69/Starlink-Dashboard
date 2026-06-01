import asyncio
import logging

from fastapi import APIRouter
from dish import diagnostics as diag, telemetry
import starlink_grpc

router = APIRouter()
logger = logging.getLogger(__name__)

_context = starlink_grpc.ChannelContext()


@router.get("/diagnostics")
async def get_diagnostics():
    """Obstruction map, dish pointing direction, and thermal data."""
    status = telemetry.get_current()

    try:
        obs_map = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, lambda: diag.get_obstruction_map(context=_context)
            ),
            timeout=4.0,
        )
    except asyncio.TimeoutError:
        logger.warning("obstruction map fetch timed out")
        obs_map = None

    return {
        "obstruction_map":         obs_map,
        "pointing": {
            "azimuth_deg":   status.get("direction_azimuth"),
            "elevation_deg": status.get("direction_elevation"),
        },
        "fraction_obstructed_pct": status.get("fraction_obstructed_pct"),
        "is_obstructed":           status.get("is_obstructed"),
        "dish_temp_c":             status.get("dish_temp_c"),
        "board_temp_c":            status.get("board_temp_c"),
        "snr_above_floor":         status.get("snr_above_floor"),
        "state":                   status.get("state"),
        "gps_ready":               status.get("gps_ready"),
        "gps_sats":                status.get("gps_sats"),
    }

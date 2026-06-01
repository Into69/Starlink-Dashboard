"""
Obstruction map and satellite pointing data from the dish gRPC API.
"""

import logging
from typing import Optional

import grpc
import starlink_grpc

logger = logging.getLogger(__name__)


def get_obstruction_map(context: starlink_grpc.ChannelContext) -> Optional[dict]:
    """
    Returns obstruction map as a flat list of SNR floats plus grid dimensions.

    Each value is 0.0–1.0 (1.0 = full signal) or -1.0 (invalid/no data).
    The grid is num_rows × num_cols arranged row-major, top = zenith.
    """
    try:
        raw = starlink_grpc.get_obstruction_map(context=context)
        num_rows = getattr(raw, "num_rows", 0)
        num_cols = getattr(raw, "num_cols", 0)
        snr_flat = list(getattr(raw, "snr", []))
        return {
            "num_rows": num_rows,
            "num_cols": num_cols,
            "snr": snr_flat,
        }
    except starlink_grpc.GrpcError as exc:
        logger.warning("obstruction map unavailable: %s", exc)
        return None
    except grpc.RpcError as exc:
        logger.warning("obstruction map gRPC error: %s", exc)
        return None


def get_pointing(context: starlink_grpc.ChannelContext) -> Optional[dict]:
    """
    Returns the dish boresight azimuth and elevation in degrees.
    These approximate the direction the dish is physically pointing.
    """
    try:
        status, _, _ = starlink_grpc.status_data(context=context)
        return {
            "azimuth_deg":   status.get("direction_azimuth"),
            "elevation_deg": status.get("direction_elevation"),
        }
    except starlink_grpc.GrpcError as exc:
        logger.warning("pointing data unavailable: %s", exc)
        return None

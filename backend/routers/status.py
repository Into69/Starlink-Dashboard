from fastapi import APIRouter
from dish import telemetry

router = APIRouter()


@router.get("/status")
def get_status():
    """Current dish status snapshot."""
    data = telemetry.get_current()
    if not data:
        return {"error": "No status data yet — dish may be unreachable"}
    return data

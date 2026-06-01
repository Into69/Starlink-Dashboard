from fastapi import APIRouter, Query
from dish import telemetry

router = APIRouter()


@router.get("/history")
def get_history(last: int = Query(default=900, ge=1, le=900)):
    """
    Rolling history buffer.
    `last` controls how many of the most-recent samples to return (max 900).
    """
    points = telemetry.get_history()
    return {"samples": len(points), "data": points[-last:]}

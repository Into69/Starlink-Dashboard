from fastapi import APIRouter
from dish.client import dish_client

router = APIRouter()


@router.get("/health")
def health():
    """
    Check whether the backend is alive and whether the dish gRPC endpoint
    is reachable. Does a live probe each time (3s timeout).
    """
    reachable = dish_client.probe()
    return {
        "backend": "ok",
        "dish_reachable": reachable,
        "dish_address": dish_client.address,
        "error": dish_client.last_error,
    }

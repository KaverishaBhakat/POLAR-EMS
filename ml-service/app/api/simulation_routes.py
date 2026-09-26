"""
Simulation & Resilience API Endpoints for POLAR-EMS ML Service.
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.database.postgres import resolve_station
from app.simulation.scenarios import (
    get_registered_scenarios,
    get_scenario_definition,
)
from app.simulation.runner import run_resilience_simulation

logger = logging.getLogger("polar_ems_ml.simulation_api")
router = APIRouter(prefix="/simulation", tags=["Simulation & Resilience"])


@router.get("/scenarios")
def list_simulation_scenarios() -> Dict[str, Any]:
    """
    List all active registered simulation scenarios for polar research stations.
    """
    scenarios = get_registered_scenarios()
    return {
        "status": "SUCCESS",
        "count": len(scenarios),
        "scenarios": scenarios,
    }


@router.get("/run/{station_id}/{scenario_id}")
def execute_resilience_simulation(
    station_id: str,
    scenario_id: str,
    horizon_hours: int = Query(24, ge=1, le=168, description="Lookahead horizon in hours"),
    initial_soc: float = Query(75.0, ge=0.0, le=100.0, description="Starting battery state of charge (%)"),
) -> Dict[str, Any]:
    """
    Executes a what-if resilience simulation scenario (e.g., 'polar-night') for a station
    and returns comparative dispatch schedule, resilience metrics, and baseline comparisons.
    """
    try:
        station = resolve_station(station_id)
        station_code = station["code"] if station else station_id.upper()
    except Exception:
        station_code = station_id.upper()

    # Validate scenario existence
    scenario_def = get_scenario_definition(scenario_id)
    if not scenario_def:
        available_ids = [s["scenario_id"] for s in get_registered_scenarios()]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown or unsupported simulation scenario '{scenario_id}'. Available: {available_ids}"
        )

    result = run_resilience_simulation(
        station_id=station_code,
        scenario_id=scenario_id,
        horizon_hours=horizon_hours,
        initial_soc=initial_soc,
    )

    if result.get("status") == "ERROR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Simulation execution failed.")
        )

    return result

"""
Scenario Definitions and Registry for POLAR-EMS Simulation & Resilience Engine.

Provides extensible scenario abstractions for what-if contingency and resilience analyses
built around the core OR-Tools MILP optimization dispatcher.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ScenarioId(str, Enum):
    POLAR_NIGHT = "polar-night"
    # Future scenarios (defined for extensibility, not yet implemented):
    GENERATOR_FAILURE = "generator-failure"
    LOW_BATTERY = "low-battery"
    WIND_DROP = "wind-drop"
    SEVERE_BLIZZARD = "severe-blizzard"
    HIGH_DEMAND = "high-demand"
    RENEWABLE_DROP = "renewable-drop"


class ScenarioMetadata(BaseModel):
    scenario_id: str = Field(..., description="Unique URL-friendly scenario identifier")
    scenario_type: str = Field(..., description="Internal scenario enumeration type")
    scenario_name: str = Field(..., description="Human-readable scenario display name")
    description: str = Field(..., description="Technical and operational scenario description")
    category: str = Field(..., description="Classification category (e.g., ENVIRONMENTAL, CONTINGENCY)")
    is_active: bool = Field(True, description="Whether the scenario is active and executable")
    provenance: Dict[str, Any] = Field(default_factory=dict, description="Scientific and engineering provenance notes")
    assumptions: Dict[str, Any] = Field(default_factory=dict, description="Scenario-specific mathematical assumptions")


# Master Scenario Registry
SCENARIO_REGISTRY: Dict[str, ScenarioMetadata] = {
    ScenarioId.POLAR_NIGHT.value: ScenarioMetadata(
        scenario_id=ScenarioId.POLAR_NIGHT.value,
        scenario_type="POLAR_NIGHT",
        scenario_name="Polar Night",
        description=(
            "Simulates mid-winter polar night conditions where solar irradiance and PV generation "
            "are 0.0 kW for all 24 hours, testing station resilience using katabatic wind, "
            "battery energy storage, and primary diesel generator commitment."
        ),
        category="ENVIRONMENTAL_STRESS",
        is_active=True,
        provenance={
            "scenario_type": "POLAR_NIGHT",
            "data_classification": "SCENARIO",
            "pv_modification": "PV generation forced to 0.0 kW for all 24 hours.",
            "wind_source": "Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.",
            "demand_source": "Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).",
            "battery_source": "Scenario initial SOC (75.0%) and physical limits [20%, 95%].",
            "generator_source": "Scenario generator fleet (GEN-01 100 kW, GEN-02 80 kW).",
            "is_demonstration_scenario": True,
            "disclaimer": "This is a modeled what-if resilience scenario, not a measured historical telemetry record."
        },
        assumptions={
            "pv_availability_multiplier": 0.0,
            "wind_availability_multiplier": 1.0,
            "demand_multiplier": 1.0,
            "initial_soc_override": None,
            "generator_availability": {
                "GEN-01": True,
                "GEN-02": True
            },
            "critical_load_protection": True
        }
    )
}


def get_registered_scenarios() -> List[Dict[str, Any]]:
    """Returns a list of all active registered simulation scenarios."""
    return [
        scenario.model_dump() if hasattr(scenario, "model_dump") else scenario.dict()
        for scenario in SCENARIO_REGISTRY.values() if scenario.is_active
    ]


def get_scenario_definition(scenario_id: str) -> Optional[ScenarioMetadata]:
    """Retrieves scenario metadata by ID or alias."""
    norm_id = scenario_id.lower().replace("_", "-")
    return SCENARIO_REGISTRY.get(norm_id)

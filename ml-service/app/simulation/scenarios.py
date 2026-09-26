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
    ),
    ScenarioId.GENERATOR_FAILURE.value: ScenarioMetadata(
        scenario_id=ScenarioId.GENERATOR_FAILURE.value,
        scenario_type="GENERATOR_FAILURE",
        scenario_name="Primary Generator Failure",
        description="Simulates the unavailability of the primary diesel generator for the full 24-hour horizon.",
        category="RESILIENCE",
        is_active=True,
        provenance={
            "scenario_type": "GENERATOR_FAILURE",
            "data_classification": "SCENARIO",
            "failed_generator_id": "GEN-01",
            "failed_generator_name": "Primary Genset (100 kW)",
            "failed_generator_rating_kw": 100.0,
            "failure_rationale": "GEN-01 represents the primary and largest single generator unit (100 kW vs 80 kW GEN-02). Its total outage represents the single most severe N-1 generation contingency for the Maitri microgrid.",
            "pv_source": "Historical December climatology scenario (100 kW capacity, PR=0.80).",
            "wind_source": "Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.",
            "demand_source": "Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).",
            "battery_source": "Scenario initial SOC (75.0%) and physical limits [20%, 95%].",
            "generator_source": "Scenario generator fleet with GEN-01 forced offline and GEN-02 (80 kW) remaining operational.",
            "is_demonstration_scenario": True,
            "disclaimer": "All Generator Failure results are modeled what-if results and are not measurements of an actual Maitri generator failure."
        },
        assumptions={
            "failed_generator_id": "GEN-01",
            "g1_available": False,
            "g2_available": True,
            "generator_availability": {
                "GEN-01": False,
                "GEN-02": True
            },
            "pv_availability_multiplier": 1.0,
            "wind_availability_multiplier": 1.0,
            "demand_multiplier": 1.0,
            "initial_soc_override": None,
            "critical_load_protection": True
        }
    ),
    ScenarioId.LOW_BATTERY.value: ScenarioMetadata(
        scenario_id=ScenarioId.LOW_BATTERY.value,
        scenario_type="LOW_BATTERY",
        scenario_name="Critically Low Battery State",
        description=(
            "Simulates a contingency condition where the microgrid enters the 24-hour horizon with a "
            "critically low initial battery state of charge (20.0%, at the operational lower limit), "
            "evaluating whether station renewables and generator dispatch can protect critical life-support "
            "loads and replenish energy storage."
        ),
        category="RESILIENCE",
        is_active=True,
        provenance={
            "scenario_type": "LOW_BATTERY",
            "data_classification": "SCENARIO",
            "battery_modification": "Initial BESS state of charge set to 20.0% (70.0 kWh), representing the lower operational reserve floor.",
            "battery_capacity_kwh": 350.0,
            "pv_source": "Historical December climatology scenario (100 kW capacity, PR=0.80).",
            "wind_source": "Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.",
            "demand_source": "Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).",
            "generator_source": "Scenario generator fleet (GEN-01 100 kW, GEN-02 80 kW).",
            "is_demonstration_scenario": True,
            "disclaimer": "All Low Battery results are modeled what-if results and are not measurements of an actual Maitri battery depletion event."
        },
        assumptions={
            "initial_soc": 20.0,
            "initial_battery_soc_percent": 20.0,
            "g1_available": True,
            "g2_available": True,
            "generator_availability": {
                "GEN-01": True,
                "GEN-02": True
            },
            "pv_availability_multiplier": 1.0,
            "wind_availability_multiplier": 1.0,
            "demand_multiplier": 1.0,
            "critical_load_protection": True
        }
    ),
    ScenarioId.RENEWABLE_DROP.value: ScenarioMetadata(
        scenario_id=ScenarioId.RENEWABLE_DROP.value,
        scenario_type="RENEWABLE_DROP",
        scenario_name="Renewable Generation Drop",
        description=(
            "Simulates a severe 80% reduction across both solar PV and wind generation for the full 24-hour horizon, "
            "testing station resilience and thermal dispatch when only 20% of renewable generation remains available."
        ),
        category="RESILIENCE",
        is_active=True,
        provenance={
            "scenario_type": "RENEWABLE_DROP",
            "data_classification": "SCENARIO",
            "pv_modification": "Solar PV generation scaled by 0.20 (80% reduction) for all 24 hours.",
            "wind_modification": "Wind generation scaled by 0.20 (80% reduction) for all 24 hours.",
            "retention_factor": 0.20,
            "drop_factor": 0.80,
            "pv_source": "Historical December climatology scenario (100 kW baseline capacity, PR=0.80) scaled to 20% availability.",
            "wind_source": "Maitri 2019 observed wind speed converted to modeled turbine power (50 kW baseline capacity) scaled to 20% availability.",
            "demand_source": "Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).",
            "battery_source": "Baseline initial SOC (75.0%) and physical limits [20%, 95%].",
            "generator_source": "Baseline generator fleet (GEN-01 100 kW, GEN-02 80 kW, both available).",
            "is_demonstration_scenario": True,
            "disclaimer": "The 80% renewable reduction is a scenario assumption for resilience testing and does not represent a measured Maitri event."
        },
        assumptions={
            "pv_availability_multiplier": 0.20,
            "wind_availability_multiplier": 0.20,
            "demand_multiplier": 1.0,
            "initial_soc_override": None,
            "g1_available": True,
            "g2_available": True,
            "generator_availability": {
                "GEN-01": True,
                "GEN-02": True
            },
            "critical_load_protection": True
        }
    ),
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

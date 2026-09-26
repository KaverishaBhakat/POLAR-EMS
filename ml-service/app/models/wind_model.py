"""
Wind Turbine Power Model for POLAR-EMS.
Implements standard aerodynamic piecewise wind power curve conversion:
- v < cut_in: 0 kW
- cut_in <= v < rated: capacity * ((v - cut_in) / (rated - cut_in))^3
- rated <= v < cut_out: capacity
- v >= cut_out: 0 kW (storm survival cut-out)
- modeled_power_kw = raw_power_kw * availability_factor

DISCLAIMER: Modeled electrical generation based on scenario engineering assumptions.
It does NOT represent measured turbine generation telemetry.
"""

from typing import Dict, Any, Optional, Union
import math
import numpy as np


def wind_speed_to_power(
    wind_speed_ms: Optional[Union[float, int]],
    config: Optional[Dict[str, Any]] = None,
    wind_capacity_kw: Optional[float] = None,
    cut_in_speed_ms: Optional[float] = None,
    rated_speed_ms: Optional[float] = None,
    cut_out_speed_ms: Optional[float] = None,
    availability_factor: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Converts meteorological wind speed (m/s) to modeled electrical power (kW)
    using an idealized aerodynamic piecewise turbine power curve.

    Args:
        wind_speed_ms: Wind speed observation in meters per second.
        config: Optional configuration dictionary containing turbine parameters.
        wind_capacity_kw: Optional override for nameplate capacity in kW (default 50.0).
        cut_in_speed_ms: Optional override for cut-in velocity in m/s (default 3.5).
        rated_speed_ms: Optional override for rated velocity in m/s (default 12.0).
        cut_out_speed_ms: Optional override for cut-out velocity in m/s (default 25.0).
        availability_factor: Optional override for availability derating (default 0.90).

    Returns:
        Dictionary containing:
            - wind_speed_ms: input velocity (m/s)
            - raw_power_kw: theoretical aerodynamic power before availability derating (kW)
            - modeled_wind_power_kw: final electrical output after availability factor (kW)
            - is_below_cut_in: bool
            - is_cut_out: bool
            - is_rated: bool
            - status: str classification
    """
    cfg = config or {}
    capacity = float(wind_capacity_kw if wind_capacity_kw is not None else cfg.get("wind_capacity_kw", 50.0))
    cut_in = float(cut_in_speed_ms if cut_in_speed_ms is not None else cfg.get("cut_in_speed_ms", 3.5))
    rated = float(rated_speed_ms if rated_speed_ms is not None else cfg.get("rated_speed_ms", 12.0))
    cut_out = float(cut_out_speed_ms if cut_out_speed_ms is not None else cfg.get("cut_out_speed_ms", 25.0))
    avail = float(availability_factor if availability_factor is not None else cfg.get("availability_factor", 0.90))

    # Handle missing / invalid wind speed
    if wind_speed_ms is None or (isinstance(wind_speed_ms, float) and (math.isnan(wind_speed_ms) or np.isnan(wind_speed_ms))):
        return {
            "wind_speed_ms": None,
            "raw_power_kw": None,
            "modeled_wind_power_kw": None,
            "is_below_cut_in": False,
            "is_cut_out": False,
            "is_rated": False,
            "status": "MISSING_DATA",
        }

    v = float(wind_speed_ms)
    if v < 0.0:
        # Physical clamp for non-negative wind speed
        v = 0.0

    # Piecewise Aerodynamic Power Curve
    if v < cut_in:
        raw_power = 0.0
        is_below_cut_in = True
        is_cut_out = False
        is_rated = False
        status = "BELOW_CUT_IN"
    elif cut_in <= v < rated:
        # Cubic aerodynamic power curve ramp
        raw_power = capacity * (((v - cut_in) / (rated - cut_in)) ** 3)
        is_below_cut_in = False
        is_cut_out = False
        is_rated = False
        status = "PARTIAL_LOAD_RAMP"
    elif rated <= v < cut_out:
        # Rated output plateau
        raw_power = capacity
        is_below_cut_in = False
        is_cut_out = False
        is_rated = True
        status = "RATED_OUTPUT"
    else: # v >= cut_out
        # High-wind storm survival shutdown
        raw_power = 0.0
        is_below_cut_in = False
        is_cut_out = True
        is_rated = False
        status = "STORM_CUT_OUT"

    modeled_power = round(raw_power * avail, 4)

    return {
        "wind_speed_ms": round(v, 4),
        "raw_power_kw": round(raw_power, 4),
        "modeled_wind_power_kw": modeled_power,
        "is_below_cut_in": is_below_cut_in,
        "is_cut_out": is_cut_out,
        "is_rated": is_rated,
        "status": status,
    }

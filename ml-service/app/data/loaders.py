"""
PostgreSQL Data Loaders for POLAR-EMS ML Service.
Extracts historical weather, energy load, and renewable generation data using parameterized SQL.
"""

import logging
from typing import Optional, Union
from datetime import datetime
import pandas as pd
from sqlalchemy import text
from app.db import get_db_engine, resolve_station_info

logger = logging.getLogger("polar_ems_ml.loaders")


def _get_target_station_id(station_identifier: str) -> Optional[str]:
    """Helper to resolve station code or UUID to database station UUID."""
    st = resolve_station_info(station_identifier)
    if st:
        return st["id"]
    return None


def load_weather_data(
    station_id: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
) -> pd.DataFrame:
    """
    Load historical weather records for a specific station from 'weather_data' table.
    
    Fields extracted according to Prisma schema:
      - id, stationId (as station_id), timestamp, temperature, pressure,
        humidity, windSpeed (as wind_speed), windDirection (as wind_direction),
        solarRadiation (as solar_radiation), createdAt (as created_at)
    """
    actual_station_id = _get_target_station_id(station_id) or station_id
    engine = get_db_engine()

    clauses = ['"stationId" = :station_id']
    params = {"station_id": actual_station_id}

    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = str(start_date)
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = str(end_date)

    where_sql = " AND ".join(clauses)
    query = text(f"""
        SELECT 
            id,
            "stationId" AS station_id,
            timestamp,
            temperature,
            pressure,
            humidity,
            "windSpeed" AS wind_speed,
            "windDirection" AS wind_direction,
            "solarRadiation" AS solar_radiation,
            "createdAt" AS created_at
        FROM weather_data
        WHERE {where_sql}
        ORDER BY timestamp ASC
    """)

    with engine.connect() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    logger.info(f"Loaded {len(df)} weather records for station='{station_id}'")
    return df


def load_energy_data(
    station_id: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
) -> pd.DataFrame:
    """
    Load historical energy demand records for a specific station from 'energy_loads' table.
    
    Fields extracted according to Prisma schema:
      - id, stationId (as station_id), timestamp, totalLoad (as total_load),
        heatingLoad, waterLoad, communicationLoad, laboratoryLoad, refrigerationLoad, flexibleLoad
    """
    actual_station_id = _get_target_station_id(station_id) or station_id
    engine = get_db_engine()

    clauses = ['"stationId" = :station_id']
    params = {"station_id": actual_station_id}

    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = str(start_date)
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = str(end_date)

    where_sql = " AND ".join(clauses)
    query = text(f"""
        SELECT 
            id,
            "stationId" AS station_id,
            timestamp,
            "totalLoad" AS total_load,
            "heatingLoad" AS heating_load,
            "waterLoad" AS water_load,
            "communicationLoad" AS communication_load,
            "laboratoryLoad" AS laboratory_load,
            "refrigerationLoad" AS refrigeration_load,
            "flexibleLoad" AS flexible_load,
            "createdAt" AS created_at
        FROM energy_loads
        WHERE {where_sql}
        ORDER BY timestamp ASC
    """)

    with engine.connect() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    logger.info(f"Loaded {len(df)} energy records for station='{station_id}'")
    return df


def load_renewable_data(
    station_id: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
) -> pd.DataFrame:
    """
    Load historical renewable generation records for a specific station from 'renewable_generation' table.
    
    Fields extracted according to Prisma schema:
      - id, stationId (as station_id), timestamp, solarPower (as solar_power),
        windPower (as wind_power), totalRenewable (as total_renewable), createdAt (as created_at)
    """
    actual_station_id = _get_target_station_id(station_id) or station_id
    engine = get_db_engine()

    clauses = ['"stationId" = :station_id']
    params = {"station_id": actual_station_id}

    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = str(start_date)
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = str(end_date)

    where_sql = " AND ".join(clauses)
    query = text(f"""
        SELECT 
            id,
            "stationId" AS station_id,
            timestamp,
            "solarPower" AS solar_power,
            "windPower" AS wind_power,
            "totalRenewable" AS total_renewable,
            "createdAt" AS created_at
        FROM renewable_generation
        WHERE {where_sql}
        ORDER BY timestamp ASC
    """)

    with engine.connect() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    logger.info(f"Loaded {len(df)} renewable records for station='{station_id}'")
    return df

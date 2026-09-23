"""
PostgreSQL data loaders for POLAR-EMS ML Service.
Extracts historical weather, energy load, and renewable generation data using parameterized queries.
"""

import logging
from typing import Optional
import pandas as pd
from sqlalchemy import text
from app.database.postgres import get_db_engine

logger = logging.getLogger("polar_ems_ml.data_loader")


def load_weather_data(
    station_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load weather observations for a specific station.
    
    Fields extracted according to Prisma schema:
      - id, stationId, timestamp, temperature, pressure, humidity, windSpeed, windDirection, solarRadiation
    """
    engine = get_db_engine()
    
    clauses = ['"stationId" = :station_id']
    params = {"station_id": station_id}
    
    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = start_date
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = end_date
        
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
    
    logger.info(f"Loaded {len(df)} weather records for station_id={station_id}")
    return df


def load_energy_data(
    station_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load energy demand loads for a specific station.
    
    Fields extracted according to Prisma schema:
      - id, stationId, timestamp, totalLoad, heatingLoad, waterLoad, 
        communicationLoad, laboratoryLoad, refrigerationLoad, flexibleLoad
    """
    engine = get_db_engine()
    
    clauses = ['"stationId" = :station_id']
    params = {"station_id": station_id}
    
    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = start_date
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = end_date
        
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
    
    logger.info(f"Loaded {len(df)} energy load records for station_id={station_id}")
    return df


def load_renewable_data(
    station_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Load renewable generation data for a specific station.
    
    Fields extracted according to Prisma schema:
      - id, stationId, timestamp, solarPower, windPower, totalRenewable
    """
    engine = get_db_engine()
    
    clauses = ['"stationId" = :station_id']
    params = {"station_id": station_id}
    
    if start_date:
        clauses.append("timestamp >= :start_date")
        params["start_date"] = start_date
    if end_date:
        clauses.append("timestamp <= :end_date")
        params["end_date"] = end_date
        
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
    
    logger.info(f"Loaded {len(df)} renewable generation records for station_id={station_id}")
    return df

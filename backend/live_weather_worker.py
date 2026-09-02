import os
import json
import time
import asyncio
import logging
import httpx
import random
from shapely.geometry import shape

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("LiveWeatherWorker")

# Internal Docker DNS for FastAPI
FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL", "http://mdoner-predictive-engine:8000")
TELEMETRY_URL = f"{FASTAPI_BASE_URL}/api/v1/telemetry"
ZONES_API_URL = f"{FASTAPI_BASE_URL}/api/v1/zones"

async def fetch_and_push_weather():
    async with httpx.AsyncClient() as client:
        while True:
            logger.info("Fetching dynamic vulnerable zones from PostGIS Database...")
            try:
                zones_res = await client.get(ZONES_API_URL, timeout=10.0)
                if zones_res.status_code == 200:
                    feature_collection = zones_res.json()
                    zones = feature_collection.get("features", [])
                    logger.info(f"Loaded {len(zones)} active zones from the database.")
                else:
                    logger.error("Failed to fetch zones. Retrying in 60s...")
                    await asyncio.sleep(60)
                    continue
            except Exception as e:
                logger.error(f"Error connecting to FastAPI backend: {e}")
                await asyncio.sleep(60)
                continue

            logger.info("Fetching live weather satellite data from Open-Meteo for NER zones...")
            for feature in zones:
                try:
                    props = feature.get("properties", {})
                    zone_code = props.get("zone_code", "UNKNOWN-ZONE")
                    # We can use the zone_code as the simulated IoT node_id
                    node_id = f"IOT-{zone_code.split('-')[-1]}"
                    
                    # Calculate centroid of the zone using Shapely
                    geom = shape(feature["geometry"])
                    centroid = geom.centroid
                    lon, lat = centroid.x, centroid.y

                    # Open-Meteo API provides hourly precipitation and soil moisture derived from satellite/radar models
                    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation,soil_moisture_3_9cm&hourly=precipitation"
                    response = await client.get(url, timeout=10.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        current = data.get("current", {})
                        
                        # Precipitation in mm
                        precip = current.get("precipitation", 0.0)
                        
                        # Soil moisture (m3/m3) -> convert to percentage (approximate scaling 0-0.5 to 0-100%)
                        moisture_raw = current.get("soil_moisture_3_9cm", 0.25)
                        moisture_pct = min(100.0, max(20.0, moisture_raw * 200))
                        
                        # Generate physical sensor values derived from weather
                        pore_pressure = 5.0 + (precip * 3.5) + random.uniform(0.5, 2.0)
                        tilt_x = random.uniform(0.1, 1.5) if precip < 5.0 else random.uniform(1.5, 4.5)
                        tilt_y = random.uniform(0.1, 1.0)
                        
                        payload = {
                            "node_id": node_id,
                            "node_code": zone_code,
                            "soil_moisture_percentage": round(moisture_pct, 2),
                            "tilt_x": round(tilt_x, 2),
                            "tilt_y": round(tilt_y, 2),
                            "pore_water_pressure": round(pore_pressure, 2),
                            "hourly_rainfall_intensity": precip,
                            "rainfall_duration_hours": 24.0
                        }
                        
                        # Post to FastAPI telemetry endpoint to trigger AI model
                        api_res = await client.post(TELEMETRY_URL, json=payload, timeout=10.0)
                        if api_res.status_code == 201:
                            logger.info(f"Successfully updated {zone_code} (Rain: {precip}mm, Soil: {payload['soil_moisture_percentage']}%)")
                        else:
                            logger.error(f"Failed to post data for {zone_code}: {api_res.text}")
                    else:
                        logger.error(f"Open-Meteo API error for {zone_code}: {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Exception during weather fetch for {zone_code}: {e}")
                
                # Sleep briefly between zone requests to avoid rate limits
                await asyncio.sleep(2)
            
            # Run every 5 minutes (300 seconds)
            logger.info("Waiting 5 minutes for next satellite orbital update...")
            await asyncio.sleep(300)

if __name__ == "__main__":
    asyncio.run(fetch_and_push_weather())

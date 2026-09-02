import os
import json
import time
import asyncio
import logging
import httpx
import random

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("LiveWeatherWorker")

FASTAPI_URL = os.getenv("FASTAPI_INGEST_URL", "http://mdoner-predictive-engine:8000/api/v1/telemetry")

# These coordinates correspond to the 8 NER zones seeded in the DB
ZONES = [
    {"node_id": "IOT-MEGH-001", "node_code": "NER-ZONE-MEGH-001", "lat": 25.6811, "lon": 91.9002},
    {"node_id": "IOT-ASM-002", "node_code": "NER-ZONE-ASM-002", "lat": 25.1052, "lon": 93.0185},
    {"node_id": "IOT-SKM-003", "node_code": "NER-ZONE-SKM-003", "lat": 27.2882, "lon": 88.5448},
    {"node_id": "IOT-MIZ-004", "node_code": "NER-ZONE-MIZ-004", "lat": 23.7533, "lon": 92.7032},
    {"node_id": "IOT-NAG-005", "node_code": "NER-ZONE-NAG-005", "lat": 25.6179, "lon": 94.1030},
    {"node_id": "IOT-ARN-006", "node_code": "NER-ZONE-ARN-006", "lat": 27.2471, "lon": 92.4217},
    {"node_id": "IOT-MEGH-007", "node_code": "NER-ZONE-MEGH-007", "lat": 25.2982, "lon": 91.5822},
    {"node_id": "IOT-MNP-008", "node_code": "NER-ZONE-MNP-008", "lat": 24.8170, "lon": 93.6231},
]

async def fetch_and_push_weather():
    async with httpx.AsyncClient() as client:
        while True:
            logger.info("Fetching live weather satellite data from Open-Meteo for NER zones...")
            for zone in ZONES:
                try:
                    # Open-Meteo API provides hourly precipitation and soil moisture derived from satellite/radar models
                    url = f"https://api.open-meteo.com/v1/forecast?latitude={zone['lat']}&longitude={zone['lon']}&current=precipitation,soil_moisture_3_9cm&hourly=precipitation"
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
                        # High rainfall -> higher pore water pressure
                        pore_pressure = 5.0 + (precip * 3.5) + random.uniform(0.5, 2.0)
                        tilt_x = random.uniform(0.1, 1.5) if precip < 5.0 else random.uniform(1.5, 4.5)
                        tilt_y = random.uniform(0.1, 1.0)
                        
                        payload = {
                            "node_id": zone["node_id"],
                            "node_code": zone["node_code"],
                            "soil_moisture_percentage": round(moisture_pct, 2),
                            "tilt_x": round(tilt_x, 2),
                            "tilt_y": round(tilt_y, 2),
                            "pore_water_pressure": round(pore_pressure, 2),
                            "hourly_rainfall_intensity": precip,
                            "rainfall_duration_hours": 24.0
                        }
                        
                        # Post to FastAPI telemetry endpoint to trigger AI model
                        api_res = await client.post(FASTAPI_URL, json=payload, timeout=10.0)
                        if api_res.status_code == 201:
                            logger.info(f"Successfully updated {zone['node_code']} (Rain: {precip}mm, Soil: {payload['soil_moisture_percentage']}%)")
                        else:
                            logger.error(f"Failed to post data for {zone['node_code']}: {api_res.text}")
                    else:
                        logger.error(f"Open-Meteo API error for {zone['node_code']}: {response.status_code}")
                        
                except Exception as e:
                    logger.error(f"Exception during weather fetch for {zone['node_code']}: {e}")
                
                # Sleep briefly between zone requests to avoid rate limits
                await asyncio.sleep(2)
            
            # Run every 5 minutes (300 seconds)
            logger.info("Waiting 5 minutes for next satellite orbital update...")
            await asyncio.sleep(300)

if __name__ == "__main__":
    asyncio.run(fetch_and_push_weather())

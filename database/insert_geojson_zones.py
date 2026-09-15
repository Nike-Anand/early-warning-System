"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
High-Precision GeoJSON Polygon & Intersecting Route Ingestion Tool
==============================================================================
Loads geocoded administrative boundaries and highway vectors for critical
landslide corridors across Assam (Haflong / Jatinga) and Mizoram (Aizawl / NH-54).
"""

import os
import json
import logging
import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] - %(message)s")
logger = logging.getLogger("PostGIS-GeoJSON-Populator")

NER_LANDSLIDE_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "zone_code": "NER-ZONE-ASM-HAFLONG",
                "zone_name": "Haflong Hill Jatinga Failure Corridor (Assam)",
                "state": "Assam",
                "district": "Dima Hasao",
                "average_slope_angle": 44.5,
                "historical_incident_count": 14,
                "soil_type": "Colluvial Shale & Sandstone Debris",
                "soil_cohesion": 10.5,
                "soil_internal_friction_angle": 26.0,
                "soil_unit_weight": 17.5,
                "soil_depth": 3.0,
                "current_risk_status": "CRITICAL",
                "current_fos": 0.88
            },
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[[92.88, 25.12], [92.93, 25.12], [92.93, 25.16], [92.88, 25.16], [92.88, 25.12]]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "zone_code": "NER-ZONE-MIZ-AIZAWL",
                "zone_name": "Aizawl Sairang Ridge Section (Mizoram NH-54)",
                "state": "Mizoram",
                "district": "Aizawl",
                "average_slope_angle": 49.0,
                "historical_incident_count": 19,
                "soil_type": "Clayey Silt with Mudstone",
                "soil_cohesion": 8.0,
                "soil_internal_friction_angle": 24.5,
                "soil_unit_weight": 16.8,
                "soil_depth": 3.5,
                "current_risk_status": "HIGH",
                "current_fos": 1.12
            },
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[[92.65, 23.70], [92.73, 23.70], [92.73, 23.75], [92.65, 23.75], [92.65, 23.70]]]]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "zone_code": "NER-ZONE-ASM-KAMAKHYA",
                "zone_name": "Guwahati Kamakhya Hill Foot-Slopes (Assam)",
                "state": "Assam",
                "district": "Kamrup Metropolitan",
                "average_slope_angle": 34.0,
                "historical_incident_count": 6,
                "soil_type": "Laterite Red Silt",
                "soil_cohesion": 14.0,
                "soil_internal_friction_angle": 30.0,
                "soil_unit_weight": 18.5,
                "soil_depth": 2.2,
                "current_risk_status": "MEDIUM",
                "current_fos": 1.48
            },
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[[91.68, 26.15], [91.72, 26.15], [91.72, 26.18], [91.68, 26.18], [91.68, 26.15]]]]
            }
        }
    ]
}


def inject_mock_geojson_zones():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_secure_password_sih26001@localhost:5432/mdoner_gis")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        logger.info("Successfully established connection into target PostGIS database.")

        for feature in NER_LANDSLIDE_GEOJSON["features"]:
            props = feature["properties"]
            geom_string = json.dumps(feature["geometry"])
            logger.info(f"Injecting spatial coordinates for zone: {props['zone_name']}")

            cursor.execute("""
                INSERT INTO vulnerable_zones (
                    zone_code, zone_name, state, district, geom, average_slope_angle,
                    historical_incident_count, soil_type, soil_cohesion,
                    soil_internal_friction_angle, soil_unit_weight, soil_depth,
                    current_risk_status, current_fos
                ) VALUES (
                    %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s,
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (zone_code) DO UPDATE SET
                    geom = EXCLUDED.geom,
                    current_risk_status = EXCLUDED.current_risk_status,
                    current_fos = EXCLUDED.current_fos,
                    updated_at = CURRENT_TIMESTAMP;
            """, (
                props["zone_code"], props["zone_name"], props["state"], props["district"],
                geom_string, props["average_slope_angle"], props["historical_incident_count"],
                props["soil_type"], props["soil_cohesion"], props["soil_internal_friction_angle"],
                props["soil_unit_weight"], props["soil_depth"], props["current_risk_status"],
                props["current_fos"]
            ))

        # Insert intersecting highway routes and village points
        cursor.execute("""
            INSERT INTO infrastructure_elements (element_name, element_type, route_number, geom, current_status)
            VALUES 
                ('National Highway 6 (Jatinga-Silchar Route Alignment)', 'HIGHWAY', 'NH-6', ST_GeomFromText('LINESTRING(92.85 25.10, 92.90 25.14, 92.95 25.18)', 4326), 'blocked'),
                ('National Highway 54 (Sairang-Aizawl Route Bypass Link)', 'HIGHWAY', 'NH-54', ST_GeomFromText('LINESTRING(92.60 23.68, 92.68 23.72, 92.75 23.78)', 4326), 'partially_blocked')
            ON CONFLICT DO NOTHING;

            INSERT INTO infrastructure_elements (element_name, element_type, geom, current_status)
            VALUES 
                ('Jatinga Tribal Settlement Cluster', 'VILLAGE', ST_GeomFromText('POINT(92.89 25.13)', 4326), 'open'),
                ('Sairang Valley Edge Outpost', 'VILLAGE', ST_GeomFromText('POINT(92.67 23.71)', 4326), 'open')
            ON CONFLICT DO NOTHING;
        """)

        conn.commit()
        logger.info("[SUCCESS] Regional GeoJSON landslide hazard corridors loaded into PostGIS.")

    except Exception as e:
        logger.error(f"Error populating geospatial datasets: {str(e)}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    inject_mock_geojson_zones()

"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
Mock Spatial & High-Frequency Telemetry Data Generator
Author: MDoNER Disaster Management Solutions
==============================================================================
This script seeds the PostGIS spatial database with realistic geocoded datasets
spanning high-risk mountain sectors of the North Eastern Region of India.
"""

import os
import math
import random
import datetime
import uuid
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor

# Target Geographical Bounding Box: NER (22.0°N - 28.5°N, 89.5°E - 97.5°E)

NER_ZONES = [
    {
        "code": "NER-ZONE-MEGH-001",
        "name": "Guwahati-Shillong Highway Ridge (NH-6 / Umiam Escarpment)",
        "state": "Meghalaya",
        "district": "Ri-Bhoi / East Khasi Hills",
        "polygon_coords": [
            [91.820, 25.710], [91.870, 25.715], [91.890, 25.680],
            [91.840, 25.660], [91.810, 25.685], [91.820, 25.710]
        ],
        "slope_angle": 44.5,
        "incidents": 14,
        "soil_type": "Lateritic Red Silty Sand",
        "cohesion": 12.0,      # kPa
        "friction_angle": 27.5, # deg
        "unit_weight": 18.2,   # kN/m3
        "soil_depth": 2.8,     # m
        "status": "HIGH",
        "fos": 1.12,
        "population_density": 180
    },
    {
        "code": "NER-ZONE-ASM-002",
        "name": "Silchar-Haflong Mountain Pass (NH-27 / Jatinga Valley)",
        "state": "Assam",
        "district": "Dima Hasao",
        "polygon_coords": [
            [92.880, 25.120], [92.940, 25.140], [92.960, 25.090],
            [92.900, 25.070], [92.860, 25.095], [92.880, 25.120]
        ],
        "slope_angle": 51.0,
        "incidents": 22,
        "soil_type": "Colluvial Shale & Sandstone Debris",
        "cohesion": 8.5,
        "friction_angle": 24.0,
        "unit_weight": 17.5,
        "soil_depth": 3.4,
        "status": "CRITICAL",
        "fos": 0.86,
        "population_density": 95
    },
    {
        "code": "NER-ZONE-SKM-003",
        "name": "Gangtok-Singtam Teesta Highway (NH-10 / 9th Mile Corridor)",
        "state": "Sikkim",
        "district": "East Sikkim",
        "polygon_coords": [
            [88.580, 27.310], [88.640, 27.330], [88.660, 27.280],
            [88.610, 27.260], [88.560, 27.285], [88.580, 27.310]
        ],
        "slope_angle": 48.0,
        "incidents": 18,
        "soil_type": "Mica Schist & Phyllite Gravel",
        "cohesion": 10.5,
        "friction_angle": 26.0,
        "unit_weight": 19.0,
        "soil_depth": 2.5,
        "status": "CRITICAL",
        "fos": 0.92,
        "population_density": 220
    },
    {
        "code": "NER-ZONE-MIZ-004",
        "name": "Aizawl-Lunglei Ridge (NH-54 / Hunthar Slopes)",
        "state": "Mizoram",
        "district": "Aizawl",
        "polygon_coords": [
            [92.690, 23.750], [92.740, 23.765], [92.760, 23.720],
            [92.710, 23.705], [92.670, 23.730], [92.690, 23.750]
        ],
        "slope_angle": 39.0,
        "incidents": 9,
        "soil_type": "Clayey Silt with Sandstone Intercalations",
        "cohesion": 14.5,
        "friction_angle": 29.0,
        "unit_weight": 18.0,
        "soil_depth": 2.2,
        "status": "MEDIUM",
        "fos": 1.45,
        "population_density": 310
    },
    {
        "code": "NER-ZONE-NAG-005",
        "name": "Kohima-Dimapur Pass (NH-29 / Phesama Fault Segment)",
        "state": "Nagaland",
        "district": "Kohima",
        "polygon_coords": [
            [94.080, 25.640], [94.130, 25.660], [94.150, 25.610],
            [94.100, 25.590], [94.060, 25.615], [94.080, 25.640]
        ],
        "slope_angle": 46.0,
        "incidents": 16,
        "soil_type": "Disintegrated Clay Shale",
        "cohesion": 9.8,
        "friction_angle": 25.5,
        "unit_weight": 17.8,
        "soil_depth": 3.0,
        "status": "HIGH",
        "fos": 1.08,
        "population_density": 140
    },
    {
        "code": "NER-ZONE-ARN-006",
        "name": "Bhalukpong-Bomdila-Tawang Pass (NH-13 / Sela Approach)",
        "state": "Arunachal Pradesh",
        "district": "West Kameng",
        "polygon_coords": [
            [92.380, 27.220], [92.440, 27.240], [92.470, 27.180],
            [92.410, 27.160], [92.360, 27.190], [92.380, 27.220]
        ],
        "slope_angle": 52.5,
        "incidents": 12,
        "soil_type": "Glacial Till & Weathered Gneiss",
        "cohesion": 11.2,
        "friction_angle": 31.0,
        "unit_weight": 19.5,
        "soil_depth": 2.0,
        "status": "MEDIUM",
        "fos": 1.38,
        "population_density": 45
    },
    {
        "code": "NER-ZONE-MEGH-007",
        "name": "Sohra-Mawsynram Precipitation Escarpment",
        "state": "Meghalaya",
        "district": "East Khasi Hills",
        "polygon_coords": [
            [91.680, 25.260], [91.740, 25.280], [91.760, 25.220],
            [91.700, 25.200], [91.660, 25.230], [91.680, 25.260]
        ],
        "slope_angle": 54.0,
        "incidents": 26,
        "soil_type": "Sandstone-Limestone Jointed Horizon",
        "cohesion": 16.0,
        "friction_angle": 33.0,
        "unit_weight": 20.0,
        "soil_depth": 2.6,
        "status": "HIGH",
        "fos": 1.18,
        "population_density": 85
    },
    {
        "code": "NER-ZONE-MNP-008",
        "name": "Imphal-Jiribam Transport Route (NH-37 / Noney Sector)",
        "state": "Manipur",
        "district": "Noney / Tamenglong",
        "polygon_coords": [
            [93.580, 24.810], [93.640, 24.830], [93.660, 24.770],
            [93.600, 24.750], [93.560, 24.780], [93.580, 24.810]
        ],
        "slope_angle": 47.5,
        "incidents": 19,
        "soil_type": "Residual Sandy Silt with Mudstone",
        "cohesion": 9.0,
        "friction_angle": 25.0,
        "unit_weight": 17.6,
        "soil_depth": 3.2,
        "status": "LOW",
        "fos": 1.72,
        "population_density": 110
    }
]

INFRASTRUCTURE_DATA = [
    # Highways (LineStrings)
    {
        "name": "National Highway 6 (Guwahati - Shillong - Silchar)",
        "type": "HIGHWAY",
        "route": "NH-6",
        "status": "partially_blocked",
        "wkt": "LINESTRING(91.74 26.12, 91.83 25.70, 91.88 25.57, 92.20 25.40, 92.80 24.85)",
        "elevation": 950.0
    },
    {
        "name": "National Highway 27 (Dima Hasao Mountain Expressway)",
        "type": "HIGHWAY",
        "route": "NH-27",
        "status": "blocked",
        "wkt": "LINESTRING(92.75 25.20, 92.91 25.11, 92.95 25.08, 93.10 25.02)",
        "elevation": 720.0
    },
    {
        "name": "National Highway 10 (Siliguri - Rangpo - Gangtok)",
        "type": "HIGHWAY",
        "route": "NH-10",
        "status": "blocked",
        "wkt": "LINESTRING(88.42 27.05, 88.52 27.18, 88.61 27.28, 88.62 27.34)",
        "elevation": 1420.0
    },
    {
        "name": "National Highway 54 (Silchar - Aizawl - Lunglei)",
        "type": "HIGHWAY",
        "route": "NH-54",
        "status": "open",
        "wkt": "LINESTRING(92.72 24.30, 92.71 23.73, 92.75 23.50, 92.73 22.90)",
        "elevation": 1100.0
    },
    {
        "name": "National Highway 29 (Dimapur - Kohima - Maram)",
        "type": "HIGHWAY",
        "route": "NH-29",
        "status": "partially_blocked",
        "wkt": "LINESTRING(93.73 25.90, 93.95 25.75, 94.11 25.63, 94.18 25.50)",
        "elevation": 1450.0
    },
    # Critical Settlements and Bridges (Points)
    {
        "name": "Umiam Lake Bridge & Hydro Station",
        "type": "BRIDGE",
        "route": "NH-6",
        "status": "open",
        "wkt": "POINT(91.895 25.662)",
        "elevation": 980.0
    },
    {
        "name": "Jatinga High-Risk Valley Settlement",
        "type": "VILLAGE",
        "route": "NH-27",
        "status": "blocked",
        "wkt": "POINT(92.905 25.085)",
        "elevation": 680.0
    },
    {
        "name": "9th Mile Singtam Transit Village",
        "type": "VILLAGE",
        "route": "NH-10",
        "status": "blocked",
        "wkt": "POINT(88.612 27.282)",
        "elevation": 1380.0
    },
    {
        "name": "Hunthar Veng Settlement",
        "type": "VILLAGE",
        "route": "NH-54",
        "status": "open",
        "wkt": "POINT(92.715 23.735)",
        "elevation": 1140.0
    },
    {
        "name": "Phesama Landslide Bypass Bridge",
        "type": "BRIDGE",
        "route": "NH-29",
        "status": "partially_blocked",
        "wkt": "POINT(94.108 25.620)",
        "elevation": 1410.0
    },
    {
        "name": "Civil Hospital Nongpoh Emergency Centre",
        "type": "HOSPITAL",
        "route": "NH-6",
        "status": "open",
        "wkt": "POINT(91.875 25.895)",
        "elevation": 550.0
    }
]

CITIZEN_REPORTS = [
    {
        "name": "Debajit Bordoloi",
        "phone": "+91-98640-12345",
        "category": "MUDSLIDE",
        "severity": "CRITICAL",
        "lon": 92.912,
        "lat": 25.105,
        "desc": "Massive mudslide spilling over both carriageways near Jatinga turnout. Road completely blocked, multiple heavy trucks stranded.",
        "url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80",
        "status": "verified"
    },
    {
        "name": "Tenzing Namgyal",
        "phone": "+91-97330-67890",
        "category": "GROUND_CRACK",
        "severity": "HIGH",
        "lon": 88.618,
        "lat": 27.295,
        "desc": "Wide longitudinal tension cracks (approx. 15cm wide) developing rapidly across the road shoulder on 9th Mile hill face.",
        "url": "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=600&q=80",
        "status": "verified"
    },
    {
        "name": "Lalrinawma Sailo",
        "phone": "+91-94361-54321",
        "category": "ROCKFALL",
        "severity": "MEDIUM",
        "lon": 92.718,
        "lat": 23.742,
        "desc": "Continuous rock debris falling along cutting slope of Hunthar section. Commuters advised to navigate with extreme caution.",
        "url": "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=600&q=80",
        "status": "pending"
    },
    {
        "name": "Kevisede Angami",
        "phone": "+91-94360-98765",
        "category": "ROAD_BLOCKAGE",
        "severity": "HIGH",
        "lon": 94.112,
        "lat": 25.628,
        "desc": "Retaining wall failed under hydrostatic pressure near Phesama; half the road subsided into the gorge.",
        "url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
        "status": "verified"
    }
]

EMERGENCY_RESOURCES = [
    {
        "name": "1st Battalion NDRF Guwahati Response Base",
        "type": "NDRF_BATTALION",
        "station": "Patgaon, Guwahati",
        "lon": 91.610,
        "lat": 26.115,
        "personnel": 120,
        "officer": "Cmdt. Rajesh Kumar",
        "phone": "+91-361-2849005",
        "is_deployed": True
    },
    {
        "name": "Meghalaya SDRF Quick Response Unit Shillong",
        "type": "SDRF_TEAM",
        "station": "Mawdiangdiang, Shillong",
        "lon": 91.920,
        "lat": 25.590,
        "personnel": 45,
        "officer": "Insp. B. Marbaniang",
        "phone": "+91-364-2520112",
        "is_deployed": True
    },
    {
        "name": "BRO Heavy Excavator & Dozer Fleet Unit 42",
        "type": "HEAVY_EXCAVATOR",
        "station": "Singtam Transit Depot, Sikkim",
        "lon": 88.490,
        "lat": 27.230,
        "personnel": 18,
        "officer": "Maj. Anand Verma (BRO)",
        "phone": "+91-3592-231145",
        "is_deployed": True
    },
    {
        "name": "Dima Hasao District Emergency Relief Camp",
        "type": "RELIEF_CAMP",
        "station": "Haflong Higher Secondary Compound",
        "lon": 93.020,
        "lat": 25.170,
        "personnel": 30,
        "officer": "ADC Disaster Relief Haflong",
        "phone": "+91-3673-236222",
        "is_deployed": False
    },
    {
        "name": "Mizoram Quick Medical Ambulance Fleet (108)",
        "type": "AMBULANCE_FLEET",
        "station": "Civil Hospital Aizawl",
        "lon": 92.715,
        "lat": 23.725,
        "personnel": 24,
        "officer": "Dr. C. Lalremruata",
        "phone": "+91-389-2322318",
        "is_deployed": False
    }
]


def get_db_connection():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_secure_password_sih26001@localhost:5432/mdoner_gis")
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


def seed_database():
    print("=" * 80)
    print("MDoNER LANDSLIDE MONITORING PLATFORM (SIH ID 26001) - POSTGIS SEEDER")
    print("=" * 80)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("[1/5] Seeding Vulnerable Mountain Zones (SRID 4326 MultiPolygons)...")
        zone_id_map = {}
        for z in NER_ZONES:
            coords_str = ", ".join([f"{c[0]} {c[1]}" for c in z["polygon_coords"]])
            wkt_multipoly = f"MULTIPOLYGON((({coords_str})))"
            
            cur.execute("""
                INSERT INTO vulnerable_zones (
                    zone_code, zone_name, state, district, geom, average_slope_angle,
                    historical_incident_count, soil_type, soil_cohesion,
                    soil_internal_friction_angle, soil_unit_weight, soil_depth,
                    current_risk_status, current_fos, population_density
                ) VALUES (
                    %s, %s, %s, %s, ST_GeomFromText(%s, 4326), %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (zone_code) DO UPDATE SET
                    current_risk_status = EXCLUDED.current_risk_status,
                    current_fos = EXCLUDED.current_fos,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING zone_id, zone_code;
            """, (
                z["code"], z["name"], z["state"], z["district"], wkt_multipoly,
                z["slope_angle"], z["incidents"], z["soil_type"], z["cohesion"],
                z["friction_angle"], z["unit_weight"], z["soil_depth"],
                z["status"], z["fos"], z["population_density"]
            ))
            row = cur.fetchone()
            zone_id_map[z["code"]] = row["zone_id"]
            print(f"   [+] Added Zone [{z['code']}]: {z['name']} ({z['state']})")

        print("\n[2/5] Seeding Critical Infrastructure Elements (Highways & Settlements)...")
        for infra in INFRASTRUCTURE_DATA:
            cur.execute("""
                INSERT INTO infrastructure_elements (
                    element_name, element_type, route_number, geom,
                    current_status, elevation_meters
                ) VALUES (
                    %s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s
                );
            """, (
                infra["name"], infra["type"], infra["route"],
                infra["wkt"], infra["status"], infra["elevation"]
            ))
            print(f"   [+] Added Infrastructure: {infra['name']} [{infra['status']}]")

        print("\n[3/5] Seeding IoT Telemetry Nodes & 24-Hour Progressive Sensor Streams...")
        now = datetime.datetime.now(datetime.timezone.utc)
        
        telemetry_rows = []
        node_count = 0

        for z in NER_ZONES:
            zone_id = zone_id_map[z["code"]]
            # Seed 3 telemetry nodes per zone situated around polygon centroid
            poly_points = z["polygon_coords"]
            center_lon = sum([p[0] for p in poly_points[:-1]]) / (len(poly_points) - 1)
            center_lat = sum([p[1] for p in poly_points[:-1]]) / (len(poly_points) - 1)

            for i in range(1, 4):
                node_count += 1
                node_code = f"IOT-{z['code'].split('-')[-2]}-{z['code'].split('-')[-1]}-N{i:02d}"
                node_name = f"Station {i} ({z['district']} Sector)"
                
                # Jitter location slightly
                n_lon = center_lon + (random.random() - 0.5) * 0.02
                n_lat = center_lat + (random.random() - 0.5) * 0.02
                elevation = 450.0 + random.random() * 800.0

                cur.execute("""
                    INSERT INTO iot_sensor_nodes (
                        node_code, zone_id, node_name, geom, elevation_m,
                        battery_level, is_active
                    ) VALUES (
                        %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s
                    )
                    ON CONFLICT (node_code) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
                    RETURNING node_id;
                """, (
                    node_code, zone_id, node_name, n_lon, n_lat, elevation,
                    round(random.uniform(85.0, 99.5), 1), True
                ))
                node_id = cur.fetchone()["node_id"]

                # Generate 24-hour progressive telemetry curve (1 reading per hour)
                is_high_risk = z["status"] in ["CRITICAL", "HIGH"]

                for hour_offset in range(24, 0, -1):
                    timestamp = now - datetime.timedelta(hours=hour_offset)
                    progress = (24 - hour_offset) / 24.0

                    if is_high_risk:
                        moisture = 40.0 + progress * random.uniform(45.0, 52.0)
                        tilt_x = 0.05 + progress * random.uniform(2.5, 4.2)
                        tilt_y = -0.02 - progress * random.uniform(1.8, 3.5)
                        pore_pressure = 4.0 + progress * random.uniform(32.0, 44.0)
                        rain_intensity = 5.0 + progress * random.uniform(30.0, 55.0)
                    else:
                        moisture = 32.0 + random.uniform(-2.0, 6.0)
                        tilt_x = random.uniform(-0.05, 0.05)
                        tilt_y = random.uniform(-0.05, 0.05)
                        pore_pressure = random.uniform(1.5, 5.0)
                        rain_intensity = random.uniform(0.5, 4.0)

                    telemetry_rows.append((
                        node_id,
                        timestamp,
                        round(moisture, 2),
                        round(tilt_x, 3),
                        round(tilt_y, 3),
                        round(pore_pressure, 2),
                        round(rain_intensity, 2),
                        round(rain_intensity * 6.5, 2),
                        round(random.uniform(18.0, 24.0), 1)
                    ))

        # Bulk insert telemetry rows
        print(f"   [+] Injecting {len(telemetry_rows)} time-series telemetry records across {node_count} IoT nodes...")
        insert_telemetry_sql = """
            INSERT INTO sensor_telemetry (
                node_id, timestamp, soil_moisture_percentage, tilt_x, tilt_y,
                pore_water_pressure, hourly_rainfall_intensity,
                cumulative_rainfall_24h, ambient_temperature
            ) VALUES %s;
        """
        execute_values(cur, insert_telemetry_sql, telemetry_rows)

        print("\n[4/5] Seeding Geo-Tagged Citizen Reports...")
        for report in CITIZEN_REPORTS:
            cur.execute("""
                INSERT INTO citizen_reports (
                    reporter_name, reporter_phone, category, severity_estimate,
                    geom, landmark_description, multimedia_url, status
                ) VALUES (
                    %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s
                );
            """, (
                report["name"], report["phone"], report["category"], report["severity"],
                report["lon"], report["lat"], report["desc"], report["url"], report["status"]
            ))
            print(f"   [+] Added Citizen Incident: {report['category']} at ({report['lon']}, {report['lat']})")

        print("\n[5/5] Seeding Emergency Response & Disaster Management Resources...")
        for res in EMERGENCY_RESOURCES:
            cur.execute("""
                INSERT INTO emergency_resources (
                    resource_name, unit_type, stationed_location, geom,
                    personnel_count, contact_officer, contact_phone, is_deployed
                ) VALUES (
                    %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s
                );
            """, (
                res["name"], res["type"], res["station"],
                res["lon"], res["lat"], res["personnel"],
                res["officer"], res["phone"], res["is_deployed"]
            ))
            print(f"   [+] Added Emergency Asset: {res['name']} ({res['type']})")

        conn.commit()
        print("\n" + "=" * 80)
        print("[SUCCESS] PostGIS spatial database seeded with complete NER dataset!")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during database seeding: {str(e)}")
        raise e
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_database()

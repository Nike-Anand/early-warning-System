-- ==============================================================================
-- SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
-- Ministry of Development of North Eastern Region (MDoNER)
-- PostGIS Spatial Database Initialization Schema
-- ==============================================================================

-- 1. Enable Spatial & Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Custom Enumerated Domain Types
DO $$ BEGIN
    CREATE TYPE alert_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE infra_status AS ENUM ('open', 'blocked', 'partially_blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE infra_type AS ENUM ('HIGHWAY', 'VILLAGE', 'BRIDGE', 'HOSPITAL', 'RELIEF_SHELTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('pending', 'verified', 'resolved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_category AS ENUM ('GROUND_CRACK', 'ROCKFALL', 'MUDSLIDE', 'ROAD_BLOCKAGE', 'WATER_SURGE', 'SUBSIDENCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Vulnerable Slope Risk Zones (Polygons / MultiPolygons in SRID 4326)
CREATE TABLE IF NOT EXISTS vulnerable_zones (
    zone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_code VARCHAR(30) UNIQUE NOT NULL,
    zone_name VARCHAR(150) NOT NULL,
    state VARCHAR(50) NOT NULL,            -- e.g., 'Assam', 'Meghalaya', 'Sikkim', 'Mizoram'
    district VARCHAR(100) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    average_slope_angle FLOAT NOT NULL,    -- alpha in degrees (e.g. 35.0 - 55.0)
    historical_incident_count INT DEFAULT 0,
    soil_type VARCHAR(100) NOT NULL,       -- e.g., 'Laterite', 'Red Sandy Clay', 'Colluvial Debris'
    soil_cohesion FLOAT NOT NULL,          -- c in kPa (e.g. 10.0 - 25.0)
    soil_internal_friction_angle FLOAT NOT NULL, -- phi in degrees (e.g. 24.0 - 38.0)
    soil_unit_weight FLOAT NOT NULL,       -- gamma in kN/m3 (e.g. 16.0 - 20.0)
    soil_depth FLOAT NOT NULL,             -- failure plane depth H in meters (e.g. 1.5 - 4.5)
    current_risk_status alert_level DEFAULT 'LOW',
    current_fos FLOAT DEFAULT 1.85,
    last_rainfall_intensity FLOAT DEFAULT 0.0,
    antecedent_rainfall_72h FLOAT DEFAULT 0.0,
    population_density INT DEFAULT 120,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Critical Infrastructure Elements (LineStrings for Highways & Points for Settlements/Bridges)
CREATE TABLE IF NOT EXISTS infrastructure_elements (
    element_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    element_name VARCHAR(150) NOT NULL,
    element_type infra_type NOT NULL,
    route_number VARCHAR(50),             -- e.g. 'NH-6', 'NH-44', 'NH-10'
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    current_status infra_status DEFAULT 'open',
    vulnerable_zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE SET NULL,
    elevation_meters FLOAT DEFAULT 350.0,
    capacity_or_population INT DEFAULT 500,
    last_inspected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Physical IoT Slope Monitoring Sensor Stations
CREATE TABLE IF NOT EXISTS iot_sensor_nodes (
    node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'NER-IOT-MEGH-001'
    zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE CASCADE,
    node_name VARCHAR(100) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    elevation_m FLOAT NOT NULL,
    battery_level FLOAT DEFAULT 100.0,    -- in %
    solar_charging BOOLEAN DEFAULT TRUE,
    firmware_version VARCHAR(20) DEFAULT 'v2.4.1',
    is_active BOOLEAN DEFAULT TRUE,
    sampling_interval_sec INT DEFAULT 300,
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Partitioned High-Frequency Telemetry Data Ledger
CREATE TABLE IF NOT EXISTS sensor_telemetry (
    telemetry_id BIGSERIAL,
    node_id UUID NOT NULL REFERENCES iot_sensor_nodes(node_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    soil_moisture_percentage FLOAT NOT NULL,     -- Volumetric Water Content % (0-100)
    tilt_x FLOAT NOT NULL,                      -- Gyroscope tilt angle X in degrees
    tilt_y FLOAT NOT NULL,                      -- Gyroscope tilt angle Y in degrees
    pore_water_pressure FLOAT NOT NULL,          -- Piezometer pore pressure u in kPa
    hourly_rainfall_intensity FLOAT NOT NULL,    -- Rain gauge intensity I in mm/hr
    cumulative_rainfall_24h FLOAT DEFAULT 0.0,
    ambient_temperature FLOAT DEFAULT 22.5,     -- Celsius
    PRIMARY KEY (telemetry_id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create default monthly partitions for time-series scalability
CREATE TABLE IF NOT EXISTS sensor_telemetry_2026_01 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2026_04 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2026_07 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2026_10 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_default PARTITION OF sensor_telemetry DEFAULT;

-- 7. Citizen & Field Official Crowd-Sourced Reports
CREATE TABLE IF NOT EXISTS citizen_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name VARCHAR(100) DEFAULT 'Anonymous Citizen',
    reporter_phone VARCHAR(20),
    category report_category NOT NULL,
    severity_estimate alert_level DEFAULT 'MEDIUM',
    geom GEOMETRY(Point, 4326) NOT NULL,
    landmark_description TEXT NOT NULL,
    multimedia_url TEXT,
    offline_sync_id VARCHAR(100),
    status report_status DEFAULT 'pending',
    verified_by VARCHAR(100),
    verification_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Emergency Multi-Lingual Alert Logs
CREATE TABLE IF NOT EXISTS alert_logs (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE CASCADE,
    risk_level alert_level NOT NULL,
    factor_of_safety FLOAT NOT NULL,
    rainfall_threshold_ratio FLOAT NOT NULL,
    dispatched_languages TEXT[] NOT NULL, -- e.g. ARRAY['en', 'as', 'bn', 'hi', 'kha', 'miz']
    sms_recipients_count INT DEFAULT 0,
    whatsapp_recipients_count INT DEFAULT 0,
    websocket_broadcast BOOLEAN DEFAULT TRUE,
    summary_text TEXT NOT NULL,
    dispatched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Emergency Response & Disaster Management Resource Deployments
CREATE TABLE IF NOT EXISTS emergency_resources (
    resource_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_name VARCHAR(100) NOT NULL,
    unit_type VARCHAR(50) NOT NULL, -- 'NDRF_BATTALION', 'SDRF_TEAM', 'HEAVY_EXCAVATOR', 'AMBULANCE_FLEET', 'RELIEF_CAMP'
    stationed_location VARCHAR(100) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    personnel_count INT DEFAULT 0,
    contact_officer VARCHAR(100),
    contact_phone VARCHAR(20),
    is_deployed BOOLEAN DEFAULT FALSE,
    assigned_zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SPATIAL GIST & COMPOSITE PERFORMANCE INDEXES
-- ==============================================================================

-- Spatial GiST indexes for sub-millisecond bounding box and proximity calculations
CREATE INDEX IF NOT EXISTS idx_vulnerable_zones_geom ON vulnerable_zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_infrastructure_geom ON infrastructure_elements USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_iot_nodes_geom ON iot_sensor_nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_geom ON citizen_reports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_emergency_resources_geom ON emergency_resources USING GIST (geom);

-- B-Tree indexes for fast relational and time-series lookups
CREATE INDEX IF NOT EXISTS idx_vulnerable_zones_risk ON vulnerable_zones (current_risk_status);
CREATE INDEX IF NOT EXISTS idx_telemetry_node_timestamp ON sensor_telemetry (node_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_logs_zone_time ON alert_logs (zone_id, dispatched_at DESC);

-- ==============================================================================
-- STORED SPATIAL FUNCTIONS & STORED PROCEDURES
-- ==============================================================================

-- Helper: Find all critical infrastructure within a specified buffer radius (meters) of a vulnerable zone
CREATE OR REPLACE FUNCTION get_infrastructure_within_zone(
    p_zone_id UUID,
    p_buffer_meters FLOAT DEFAULT 2500.0
)
RETURNS TABLE (
    element_id UUID,
    element_name VARCHAR,
    element_type infra_type,
    route_number VARCHAR,
    current_status infra_status,
    distance_meters FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.element_id,
        i.element_name,
        i.element_type,
        i.route_number,
        i.current_status,
        ST_Distance(ST_Transform(z.geom, 3857), ST_Transform(i.geom, 3857)) AS distance_meters
    FROM vulnerable_zones z
    CROSS JOIN infrastructure_elements i
    WHERE z.zone_id = p_zone_id
      AND ST_DWithin(ST_Transform(z.geom, 3857), ST_Transform(i.geom, 3857), p_buffer_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update timestamps on record modifications
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vulnerable_zones_update ON vulnerable_zones;
CREATE TRIGGER trg_vulnerable_zones_update
    BEFORE UPDATE ON vulnerable_zones
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_infrastructure_update ON infrastructure_elements;
CREATE TRIGGER trg_infrastructure_update
    BEFORE UPDATE ON infrastructure_elements
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Fix: citizen_reports was missing an updated_at trigger
DROP TRIGGER IF EXISTS trg_citizen_reports_update ON citizen_reports;
CREATE TRIGGER trg_citizen_reports_update
    BEFORE UPDATE ON citizen_reports
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Forward time-series partitions for 2027 monsoon monitoring seasons
CREATE TABLE IF NOT EXISTS sensor_telemetry_2027_01 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2027_04 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2027_07 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS sensor_telemetry_2027_10 PARTITION OF sensor_telemetry
    FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');

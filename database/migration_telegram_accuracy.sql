-- NexusRisk Telegram + accuracy feedback migration.
-- Safe to run against an existing SIH 26001 database.

CREATE TABLE IF NOT EXISTS telegram_subscribers (
    subscriber_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id VARCHAR(64) NOT NULL,
    zone_id UUID NOT NULL REFERENCES vulnerable_zones(zone_id) ON DELETE CASCADE,
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    role VARCHAR(20) NOT NULL DEFAULT 'citizen',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_telegram_chat_zone UNIQUE(chat_id, zone_id),
    CONSTRAINT chk_telegram_language CHECK (language IN ('en','hi','as','bn','kha','miz')),
    CONSTRAINT chk_telegram_role CHECK (role IN ('citizen','official'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_zone_active
    ON telegram_subscribers(zone_id, active);

CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_chat_active
    ON telegram_subscribers(chat_id, active);

-- Per-chat language/role preference used by the bot's _get_user_language().
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
    chat_id VARCHAR(64) PRIMARY KEY,
    language VARCHAR(8) NOT NULL DEFAULT 'en',
    role VARCHAR(20) NOT NULL DEFAULT 'citizen',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pref_language CHECK (language IN ('en','hi','as','bn','kha','miz')),
    CONSTRAINT chk_pref_role CHECK (role IN ('citizen','official'))
);

CREATE TABLE IF NOT EXISTS telegram_feedback_events (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id VARCHAR(64) NOT NULL,
    zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE SET NULL,
    feedback_type VARCHAR(40) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_feedback_zone_time
    ON telegram_feedback_events(zone_id, created_at DESC);

CREATE TABLE IF NOT EXISTS model_predictions_log (
    prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES vulnerable_zones(zone_id) ON DELETE SET NULL,
    node_id UUID REFERENCES iot_sensor_nodes(node_id) ON DELETE SET NULL,
    predicted_level alert_level NOT NULL,
    predicted_probability FLOAT NOT NULL,
    factor_of_safety FLOAT NOT NULL,
    rainfall_threshold_ratio FLOAT NOT NULL,
    soil_moisture_percentage FLOAT,
    tilt_magnitude_deg FLOAT,
    pore_water_pressure_kpa FLOAT,
    observed_outcome BOOLEAN,
    outcome_source VARCHAR(80),
    outcome_recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_predictions_zone_time
    ON model_predictions_log(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_predictions_outcome
    ON model_predictions_log(observed_outcome, created_at DESC);

ALTER TABLE emergency_resources
    ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE emergency_resources
    ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'available';

UPDATE emergency_resources
SET availability_status = CASE WHEN is_deployed THEN 'deployed' ELSE 'available' END
WHERE availability_status IS NULL OR availability_status = '';

CREATE INDEX IF NOT EXISTS idx_emergency_resources_availability
    ON emergency_resources(unit_type, is_deployed, updated_at DESC);

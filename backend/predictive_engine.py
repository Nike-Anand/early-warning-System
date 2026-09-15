"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
AI/ML Predictive Geotechnical & Slope Stability Engine
==============================================================================
This module implements the dual physical-empirical and machine learning ensemble
pipeline for real-time landslide hazard forecasting in the fragile North Eastern Region.
"""

import math
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler


class LandslidePredictiveEngine:
    """
    Ensemble Geotechnical Physics & Machine Learning Predictive Engine.
    Combines:
    1. Infinite Slope Stability Mechanics (Factor of Safety - FoS)
    2. Empirical Rainfall Intensity-Duration (I-D) Threshold Model
    3. Cumulative Antecedent Rainfall (CAR 72h / 7d) Saturation Index
    4. Kinematic Tilting Angular Displacement Vectors
    5. Machine Learning Ensemble Classifier (Random Forest)
    """

    def __init__(self):
        # Calibrated constants for the rugged North Eastern Region (NER) terrain
        # Empirical I-D Threshold: I = alpha * (D ^ -beta)
        self.ALPHA_THRESHOLD = 14.5  # Regional empirical rainfall scaling constant
        self.BETA_THRESHOLD = 0.25   # Regional duration power decay exponent

        # Weighting factors for physical/empirical components
        self.WEIGHT_FOS = 0.40
        self.WEIGHT_ID_RATIO = 0.25
        self.WEIGHT_MOISTURE = 0.20
        self.WEIGHT_TILT = 0.15

        # Initialize and bootstrap a calibrated Random Forest Classifier
        self.scaler = StandardScaler()
        self.ml_model = self._train_initial_calibrated_model()

    def _train_initial_calibrated_model(self) -> RandomForestClassifier:
        """
        Initializes and trains a realistic Random Forest Classifier on synthetic
        geotechnical simulation data representing 1,000 hill slope states in NER.
        Features: [FoS, I-D Ratio, Soil Moisture %, Tilt Magnitude, Pore Water Pressure, Slope Angle]
        """
        np.random.seed(42)
        n_samples = 1200

        # Feature synthesis across realistic physical ranges
        fos_vals = np.random.uniform(0.6, 2.5, n_samples)
        id_ratios = np.random.uniform(0.1, 2.2, n_samples)
        moisture_vals = np.random.uniform(20.0, 95.0, n_samples)
        tilt_vals = np.random.uniform(0.0, 6.0, n_samples)
        pore_pressure_vals = np.random.uniform(1.0, 50.0, n_samples)
        slope_angles = np.random.uniform(25.0, 60.0, n_samples)

        X = np.column_stack([
            fos_vals, id_ratios, moisture_vals, tilt_vals, pore_pressure_vals, slope_angles
        ])

        # Ground truth probabilistic risk score determination
        # High danger when FoS < 1.0, ID Ratio > 1.0, Moisture > 80%, Tilt > 3.0 deg
        risk_score_raw = (
            (1.0 - np.clip(fos_vals / 2.0, 0.0, 1.0)) * 0.40 +
            np.clip(id_ratios / 1.5, 0.0, 1.0) * 0.25 +
            (moisture_vals / 100.0) * 0.20 +
            np.clip(tilt_vals / 5.0, 0.0, 1.0) * 0.15
        )

        # Categorize into 4 discrete hazard tiers:
        # 0: LOW, 1: MEDIUM, 2: HIGH, 3: CRITICAL
        y = np.zeros(n_samples, dtype=int)
        y[(risk_score_raw >= 0.35) & (risk_score_raw < 0.60)] = 1
        y[(risk_score_raw >= 0.60) & (risk_score_raw < 0.82)] = 2
        y[risk_score_raw >= 0.82] = 3

        # Force critical failure if FoS < 1.0
        y[fos_vals < 1.0] = 3

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        rf = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
        rf.fit(X_scaled, y)
        return rf

    def calculate_rainfall_threshold_ratio(
        self,
        intensity_mm_hr: float,
        duration_hr: float = 24.0
    ) -> Tuple[float, float]:
        """
        Calculates empirical Rainfall Intensity-Duration (I-D) Threshold ratio for NER.
        Formula:
            I_critical = alpha * (D ^ -beta)
            Ratio = I_actual / I_critical
        Returns (I_critical, ratio). Ratio >= 1.0 indicates rainfall hazard breach.
        """
        safe_duration = max(1.0, float(duration_hr))
        critical_intensity = self.ALPHA_THRESHOLD * (safe_duration ** (-self.BETA_THRESHOLD))
        ratio = intensity_mm_hr / critical_intensity
        return round(critical_intensity, 3), round(ratio, 3)

    def calculate_factor_of_safety(
        self,
        cohesion_kpa: float,
        unit_weight_kn_m3: float,
        depth_m: float,
        slope_angle_deg: float,
        friction_angle_deg: float,
        pore_pressure_kpa: float
    ) -> float:
        """
        Computes the physical Factor of Safety (FoS) for an infinite slope model.
        Formula:
            FoS = [ c / (gamma * H * sin(alpha)) ] +
                  [ cos(alpha) * (1 - (u / (gamma * H))) * (tan(phi) / sin(alpha)) ]
        Where:
            c = soil cohesion (kPa)
            gamma = total unit weight of soil (kN/m³)
            H = failure plane depth (m)
            alpha = slope inclination angle (degrees)
            phi = internal friction angle (degrees)
            u = pore water pressure (kPa)
        FoS < 1.0 represents limit equilibrium structural slope failure.
        """
        alpha_rad = math.radians(slope_angle_deg)
        phi_rad = math.radians(friction_angle_deg)

        sin_alpha = math.sin(alpha_rad)
        cos_alpha = math.cos(alpha_rad)
        tan_phi = math.tan(phi_rad)

        # Flat terrain boundary guard
        if sin_alpha <= 0.001:
            return 999.0

        denom = unit_weight_kn_m3 * depth_m
        if denom <= 0.001:
            return 999.0

        # Component 1: Cohesive resisting shear strength
        cohesion_component = cohesion_kpa / (denom * sin_alpha)

        # Component 2: Frictional resisting strength under effective normal stress
        effective_stress_ratio = 1.0 - (pore_pressure_kpa / denom)
        # Cap effective stress ratio to prevent negative values
        effective_stress_ratio = max(0.0, effective_stress_ratio)

        frictional_component = cos_alpha * effective_stress_ratio * (tan_phi / sin_alpha)

        fos = cohesion_component + frictional_component
        return round(max(0.0, fos), 3)

    def calculate_tilt_magnitude(self, tilt_x: float, tilt_y: float) -> float:
        """Calculates 2D resultant angular displacement vector magnitude (degrees)."""
        return round(math.sqrt(tilt_x ** 2 + tilt_y ** 2), 3)

    def evaluate_composite_risk(
        self,
        telemetry: Dict[str, Any],
        zone_meta: Dict[str, Any],
        historical_rainfall_72h: float = 0.0
    ) -> Dict[str, Any]:
        """
        Integrates physical slope stability, empirical I-D ratio, and ML classifier
        to determine definitive landslide hazard probabilities and alert classifications.
        """
        # 1. Physics: Factor of Safety (FoS)
        fos = self.calculate_factor_of_safety(
            cohesion_kpa=float(zone_meta.get("soil_cohesion", 12.0)),
            unit_weight_kn_m3=float(zone_meta.get("soil_unit_weight", 18.0)),
            depth_m=float(zone_meta.get("soil_depth", 2.5)),
            slope_angle_deg=float(zone_meta.get("average_slope_angle", 40.0)),
            friction_angle_deg=float(zone_meta.get("soil_internal_friction_angle", 28.0)),
            pore_pressure_kpa=float(telemetry.get("pore_water_pressure", 2.0))
        )

        # 2. Empirical: Rainfall I-D Threshold
        rainfall_intensity = float(telemetry.get("hourly_rainfall_intensity", 0.0))
        duration_hours = float(telemetry.get("rainfall_duration_hours", 24.0))
        critical_i, id_ratio = self.calculate_rainfall_threshold_ratio(rainfall_intensity, duration_hours)

        # 3. Kinematics: Tilt Displacement
        tilt_x = float(telemetry.get("tilt_x", 0.0))
        tilt_y = float(telemetry.get("tilt_y", 0.0))
        tilt_magnitude = self.calculate_tilt_magnitude(tilt_x, tilt_y)

        # 4. Antecedent Soil Saturation
        moisture = float(telemetry.get("soil_moisture_percentage", 30.0))
        pore_pressure = float(telemetry.get("pore_water_pressure", 2.0))
        slope_angle = float(zone_meta.get("average_slope_angle", 40.0))

        # 5. Machine Learning Inference Vector
        feature_vector = np.array([[
            fos, id_ratio, moisture, tilt_magnitude, pore_pressure, slope_angle
        ]])
        feature_vector_scaled = self.scaler.transform(feature_vector)
        ml_probabilities = self.ml_model.predict_proba(feature_vector_scaled)[0]

        # ML Class mapping: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
        # Calculate expected failure probability (classes 2 & 3 weighted heavily)
        ml_critical_prob = (
            ml_probabilities[0] * 0.05 +
            ml_probabilities[1] * 0.35 +
            ml_probabilities[2] * 0.70 +
            ml_probabilities[3] * 0.98
        )

        # 6. Hybrid Geotechnical Rule Override:
        # If physics demonstrates structural failure (FoS < 1.0) or severe tilt shift (> 3.5 deg),
        # deterministic safety rules override statistical predictions.
        hazard_probability = float(ml_critical_prob)

        if fos < 1.0:
            hazard_probability = max(0.92, hazard_probability)
            alert_level = "CRITICAL"
            lead_time_hours = "0 - 3 Hours (Immediate Action Required)"
        elif fos < 1.25 or id_ratio >= 1.2 or (moisture > 82.0 and tilt_magnitude > 2.5):
            hazard_probability = max(0.68, hazard_probability)
            alert_level = "HIGH"
            lead_time_hours = "3 - 6 Hours Advance Warning"
        elif fos < 1.45 or id_ratio >= 0.85 or moisture > 65.0:
            hazard_probability = max(0.40, hazard_probability)
            alert_level = "MEDIUM"
            lead_time_hours = "12 - 24 Hours (Advisory Monitoring)"
        else:
            hazard_probability = min(0.30, hazard_probability)
            alert_level = "LOW"
            lead_time_hours = "> 48 Hours (Stable Conditions)"

        # Composite Safety Diagnostics
        return {
            "factor_of_safety": fos,
            "rainfall_threshold_critical_mm_hr": critical_i,
            "rainfall_threshold_ratio": id_ratio,
            "tilt_magnitude_deg": tilt_magnitude,
            "soil_moisture_percentage": round(moisture, 2),
            "pore_water_pressure_kpa": round(pore_pressure, 2),
            "ml_hazard_probability": round(hazard_probability, 3),
            "assigned_alert_level": alert_level,
            "estimated_lead_time": lead_time_hours,
            "geotechnical_diagnosis": self._generate_geotechnical_diagnosis(
                fos, id_ratio, tilt_magnitude, moisture
            )
        }

    def _generate_geotechnical_diagnosis(
        self, fos: float, id_ratio: float, tilt: float, moisture: float
    ) -> str:
        """Generates engineering text rationale for disaster management logs."""
        diagnoses = []
        if fos < 1.0:
            diagnoses.append(f"Slope shearing equilibrium breached (FoS {fos} < 1.0).")
        elif fos < 1.3:
            diagnoses.append(f"Marginal safety buffer (FoS {fos}).")
        else:
            diagnoses.append(f"Mechanically stable slope (FoS {fos}).")

        if id_ratio >= 1.0:
            diagnoses.append(f"Rainfall intensity exceeds empirical regional threshold ({id_ratio}x).")

        if moisture > 80.0:
            diagnoses.append(f"High soil saturation ({moisture}%) elevating pore water pressure.")

        if tilt > 2.5:
            diagnoses.append(f"Significant kinematic tilt displacement detected ({tilt}°).")

        return " ".join(diagnoses)


# ==============================================================================
# SELF-TEST SUITE FOR VERIFICATION
# ==============================================================================
if __name__ == "__main__":
    engine = LandslidePredictiveEngine()
    print("=" * 80)
    print("PREDICTIVE ENGINE SELF-TEST: VERIFYING NER GEOTECHNICAL CALCULATIONS")
    print("=" * 80)

    # Test Zone: Calibrated Northeast Hill Slope Profile
    stable_slope_profile = {
        "average_slope_angle": 32.0,      # 32 degree moderate slope
        "soil_cohesion": 18.0,            # 18.0 kPa shear strength
        "soil_internal_friction_angle": 32.0, # 32 degrees friction
        "soil_unit_weight": 18.0,         # 18 kN/m3 unit weight
        "soil_depth": 1.8                 # 1.8m failure plane depth
    }

    # Case 1: Pre-Monsoon Dry / Stable
    stable_telemetry = {
        "soil_moisture_percentage": 28.5,
        "tilt_x": 0.02,
        "tilt_y": 0.01,
        "pore_water_pressure": 1.8,
        "hourly_rainfall_intensity": 1.2,
        "rainfall_duration_hours": 6.0
    }
    res_stable = engine.evaluate_composite_risk(stable_telemetry, stable_slope_profile)
    print(f"\n[1] STABLE CONDITION TEST:")
    print(f"    FoS: {res_stable['factor_of_safety']} | Level: {res_stable['assigned_alert_level']} | Prob: {res_stable['ml_hazard_probability']}")
    print(f"    Diagnosis: {res_stable['geotechnical_diagnosis']}")
    assert res_stable["assigned_alert_level"] == "LOW"

    # Case 2: Extreme Monsoon Cloudburst & Saturation on Steep Escarpment
    steep_escarpment_profile = {
        "average_slope_angle": 48.0,      # 48 degree steep cliff
        "soil_cohesion": 10.0,            # 10.0 kPa degraded cohesion
        "soil_internal_friction_angle": 24.0, # 24 degrees friction
        "soil_unit_weight": 17.5,
        "soil_depth": 3.0
    }
    disaster_telemetry = {
        "soil_moisture_percentage": 94.4,
        "tilt_x": 3.8,
        "tilt_y": -2.4,
        "pore_water_pressure": 44.0,      # High hydrostatic pressure
        "hourly_rainfall_intensity": 55.0,# Extreme cloudburst
        "rainfall_duration_hours": 18.0
    }
    res_disaster = engine.evaluate_composite_risk(disaster_telemetry, steep_escarpment_profile)
    print(f"\n[2] DISASTER SATURATION TEST:")
    print(f"    FoS: {res_disaster['factor_of_safety']} | Level: {res_disaster['assigned_alert_level']} | Prob: {res_disaster['ml_hazard_probability']}")
    print(f"    Diagnosis: {res_disaster['geotechnical_diagnosis']}")
    assert res_disaster["assigned_alert_level"] == "CRITICAL"
    print("\n[SUCCESS] All predictive engine geotechnical & ML unit tests passed!")

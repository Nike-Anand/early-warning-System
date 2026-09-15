"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
Remote Sensing & Satellite Multi-Spectral NDVI / NDMI Anomaly Engine
==============================================================================
Processes Sentinel-2 / Landsat-8/9 optical and infrared multi-spectral bands
to detect rapid changes in vegetation cover, deforestation, slope excavation,
and moisture saturation across rugged North Eastern Region terrains.
"""

import math
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SatelliteProcessor")


class SatelliteImageryProcessor:
    """
    Multi-Spectral Satellite Processing Engine for Geotechnical Risk Screening.
    Computes:
    1. NDVI (Normalized Difference Vegetation Index) = (NIR - RED) / (NIR + RED)
    2. NDMI (Normalized Difference Moisture Index)  = (NIR - SWIR) / (NIR + SWIR)
    3. Spatial Anomaly Scoring against historical pre-monsoon baselines
    """

    def __init__(self):
        # Critical anomaly thresholds for NER mountain canopies
        self.NDVI_CRITICAL_DROP_THRESHOLD = 0.30  # > 30% sudden loss of vegetative canopy
        self.NDMI_SATURATION_THRESHOLD = 0.45    # Severe optical moisture index saturation

    def calculate_ndvi(self, nir_band: np.ndarray, red_band: np.ndarray) -> np.ndarray:
        """
        Computes NDVI array from Near-Infrared (Band 8) and Red (Band 4).
        Formula: NDVI = (NIR - RED) / (NIR + RED)
        Values range from -1.0 (water/clouds) to +1.0 (dense rainforest canopy).
        """
        nir = nir_band.astype(np.float64)
        red = red_band.astype(np.float64)

        denominator = nir + red
        # Prevent division by zero errors over dark shadows or cloud covers
        denominator[denominator == 0] = 0.0001
        ndvi = (nir - red) / denominator
        # Clip to valid theoretical bounds
        return np.clip(ndvi, -1.0, 1.0)

    def calculate_ndmi(self, nir_band: np.ndarray, swir_band: np.ndarray) -> np.ndarray:
        """
        Computes NDMI array from Near-Infrared (Band 8) and Short-Wave Infrared (Band 11).
        Formula: NDMI = (NIR - SWIR) / (NIR + SWIR)
        Detects soil and vegetation canopy water stress and saturation levels.
        """
        nir = nir_band.astype(np.float64)
        swir = swir_band.astype(np.float64)

        denominator = nir + swir
        denominator[denominator == 0] = 0.0001
        ndmi = (nir - swir) / denominator
        return np.clip(ndmi, -1.0, 1.0)

    def evaluate_zone_canopy_anomaly(
        self,
        nir_band: np.ndarray,
        red_band: np.ndarray,
        historical_baseline_ndvi: float = 0.72
    ) -> Dict[str, Any]:
        """
        Calculates mean NDVI across the zone and determines if significant
        land-surface excavation, rock exposure, or deforestation has occurred.
        """
        ndvi_array = self.calculate_ndvi(nir_band, red_band)
        # Exclude deep water / dense clouds (values < 0.0) from vegetation baseline
        vegetated_mask = ndvi_array > 0.0
        if np.any(vegetated_mask):
            current_mean_ndvi = float(np.mean(ndvi_array[vegetated_mask]))
        else:
            current_mean_ndvi = float(np.mean(ndvi_array))

        ndvi_anomaly = round(historical_baseline_ndvi - current_mean_ndvi, 3)
        is_excavated = ndvi_anomaly >= self.NDVI_CRITICAL_DROP_THRESHOLD

        if is_excavated:
            risk_flag = "CRITICAL_EXCAVATION"
            diagnosis = f"Significant canopy loss detected (Anomaly: -{ndvi_anomaly}). Raw bedrock or fresh slope cutting exposed."
        elif ndvi_anomaly >= 0.15:
            risk_flag = "MODERATE_CLEARING"
            diagnosis = f"Moderate vegetation thinning observed (Anomaly: -{ndvi_anomaly})."
        else:
            risk_flag = "NORMAL_CANOPY"
            diagnosis = f"Vegetation canopy stable (Current NDVI: {round(current_mean_ndvi, 2)}, Baseline: {historical_baseline_ndvi})."

        return {
            "current_mean_ndvi": round(current_mean_ndvi, 3),
            "historical_baseline_ndvi": round(historical_baseline_ndvi, 3),
            "ndvi_anomaly": ndvi_anomaly,
            "risk_flag": risk_flag,
            "canopy_loss_detected": is_excavated,
            "diagnosis": diagnosis
        }

    def generate_synthetic_sentinel_bands(
        self,
        grid_size: Tuple[int, int] = (64, 64),
        scenario: str = "dense_forest"
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generates realistic synthetic multi-spectral arrays (NIR, RED, SWIR)
        to simulate Sentinel-2 10m-resolution passes over NER terrain.
        """
        rows, cols = grid_size
        np.random.seed(42)

        if scenario == "dense_forest":
            # Dense evergreen canopy: High NIR reflection, low RED absorption
            nir = np.random.uniform(0.65, 0.85, (rows, cols))
            red = np.random.uniform(0.05, 0.15, (rows, cols))
            swir = np.random.uniform(0.10, 0.25, (rows, cols))
        elif scenario == "deforested_cut_slope":
            # Unplanned hill cutting / exposed soil: Low NIR, high RED reflection
            nir = np.random.uniform(0.20, 0.35, (rows, cols))
            red = np.random.uniform(0.25, 0.40, (rows, cols))
            swir = np.random.uniform(0.35, 0.55, (rows, cols))
        else:
            # Moderate mixed settlement/forest
            nir = np.random.uniform(0.40, 0.60, (rows, cols))
            red = np.random.uniform(0.15, 0.25, (rows, cols))
            swir = np.random.uniform(0.20, 0.35, (rows, cols))

        return nir, red, swir


# Standalone self-test
if __name__ == "__main__":
    processor = SatelliteImageryProcessor()
    print("=" * 80)
    print("SATELLITE MULTI-SPECTRAL NDVI ANOMALY ENGINE TEST")
    print("=" * 80)

    # 1. Test Dense Forest Baseline
    nir_forest, red_forest, _ = processor.generate_synthetic_sentinel_bands(scenario="dense_forest")
    res_forest = processor.evaluate_zone_canopy_anomaly(nir_forest, red_forest, historical_baseline_ndvi=0.75)
    print(f"\n[1] SCENARIO: DENSE EVERGREEN HILL CANOPY")
    print(f"    NDVI: {res_forest['current_mean_ndvi']} | Anomaly: {res_forest['ndvi_anomaly']} | Status: {res_forest['risk_flag']}")
    print(f"    Diagnosis: {res_forest['diagnosis']}")
    assert res_forest["risk_flag"] == "NORMAL_CANOPY"

    # 2. Test Severe Hill Cutting / Scarp Scar
    nir_cut, red_cut, _ = processor.generate_synthetic_sentinel_bands(scenario="deforested_cut_slope")
    res_cut = processor.evaluate_zone_canopy_anomaly(nir_cut, red_cut, historical_baseline_ndvi=0.75)
    print(f"\n[2] SCENARIO: UNPLANNED HILL SLOPE EXCAVATION")
    print(f"    NDVI: {res_cut['current_mean_ndvi']} | Anomaly: {res_cut['ndvi_anomaly']} | Status: {res_cut['risk_flag']}")
    print(f"    Diagnosis: {res_cut['diagnosis']}")
    assert res_cut["canopy_loss_detected"] is True

    print("\n[SUCCESS] Satellite multi-spectral NDVI calculation unit tests passed!")

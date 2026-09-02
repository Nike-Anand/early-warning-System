# 🚨 AI-Based Early Warning & Landslide Risk Monitoring System — NER
### Ministry of Development of North Eastern Region (MDoNER) · SIH ID: **26001**

> **Status: PRODUCTION READY ✅** — 7/7 integration tests passing · Vite build clean · All backend modules verified

An industry-grade, fully integrated geotechnical disaster monitoring and early-warning platform covering all **8 NER states**: Meghalaya, Assam, Sikkim, Mizoram, Nagaland, Arunachal Pradesh, Manipur, and Tripura.

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         EDGE INGESTION LAYER                             │
│  IoT Slope Sensors → MQTT (Mosquitto :1883)   Citizen/Field Mobile Apps  │
│   Tilt · Pore-Pressure · Moisture · Rain       React Native Offline-First │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                     NGINX Reverse Proxy
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 FastAPI Engine          AI / Physics            Alert Core
 WebSocket Hub           FoS · NDVI · RF         SMS DLT (6 langs)
 MQTT Worker             Rainfall I-D            WhatsApp Business
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                         Redis :6379
                   Pub/Sub · Alert Retry Queue
                                │
                 PostgreSQL + PostGIS :5432
              SRID 4326 · GiST Indexed · Partitioned
```

---

## ⚡ Quick Deploy (Docker Compose — 1 Command)

```bash
cd deployment
docker compose up --build -d
```

| Service | URL / Port |
|---------|-----------|
| 🗺️ GIS Command Dashboard | http://localhost:3000 |
| 📡 FastAPI REST + Swagger Docs | http://localhost:8000/docs |
| 🗄️ PostGIS Database | localhost:5432 (db: `mdoner_gis`) |
| 🔴 Redis Cache & Retry Queue | localhost:6379 |
| 📶 MQTT Broker (IoT Edge) | localhost:1883 |

---

## 🚦 Pre-Flight Production Checklist

### 1. Set Environment Variables
```bash
cp .env.example backend/.env
# Then edit backend/.env and fill in ALL values
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Full PostgreSQL connection URI |
| `REDIS_URL` | ✅ | Redis connection string |
| `SMS_DLT_SENDER_ID` | ✅ | TRAI DLT Registered Sender ID |
| `SMS_DLT_TEMPLATE_ID` | ✅ | Approved DLT template ID |
| `SMS_GATEWAY_API_KEY` | ✅ | SMS carrier API key (MSG91 / Textlocal) |
| `WHATSAPP_API_TOKEN` | ✅ | Meta Business Graph API Bearer Token |
| `WHATSAPP_PHONE_ID` | ✅ | WhatsApp Business Phone Number ID |
| `CORS_ALLOW_ORIGINS` | ✅ | Production domain e.g. `https://mdoner.gov.in` |

### 2. Change Default Postgres Password
```yaml
# deployment/docker-compose.yml — line 18
POSTGRES_PASSWORD: YOUR_STRONG_RANDOM_PASSWORD
```

### 3. MQTT Broker TLS Hardening
```bash
# Generate or provide CA-signed certificates
# Then update deployment/mosquitto.conf:
# listener 8883
# cafile /mosquitto/certs/ca.crt
# certfile /mosquitto/certs/server.crt
# keyfile /mosquitto/certs/server.key
```

### 4. Enable NGINX HTTPS
```nginx
# deployment/nginx.conf — add to server block:
listen 443 ssl;
ssl_certificate     /etc/ssl/mdoner.crt;
ssl_certificate_key /etc/ssl/mdoner.key;
```

---

## 📡 Simulate Live IoT Telemetry (MQTT)

After deployment, fire a CRITICAL sensor reading from any terminal:

```bash
docker exec -it mdoner-mqtt-broker mosquitto_pub \
  -t "mdoner/ner/sensor/NER-IOT-MEGH-001-N01/telemetry" \
  -m '{
    "soil_moisture_percentage": 94.2,
    "tilt_x": 4.5,
    "tilt_y": -2.1,
    "pore_water_pressure": 44.0,
    "hourly_rainfall_intensity": 58.0
  }'
```

**Chain of events**: MQTT Worker receives → FastAPI ingests → AI engine computes FoS → CRITICAL threshold breached → WebSocket red alert fires to dashboard → SMS + WhatsApp dispatch in 6 languages.

---

## 🧪 Automated Integration Testing

```bash
# No pytest install required — standalone runner
py tests/test_integration_pipeline.py

# Or with pytest
py -m pytest tests/ -v
```

**Expected — 7/7 PASS:**
```
[PASS] Infinite Slope Factor of Safety (Stable Condition)
[PASS] Infinite Slope Factor of Safety (Failure Condition)
[PASS] Empirical Rainfall I-D Threshold Calculation
[PASS] Composite Risk Classification (CRITICAL Alert)
[PASS] Satellite NDVI Normalization [-1.0, 1.0]
[PASS] Satellite Canopy Deforestation / Hill Cut Anomaly Detection
[PASS] Multi-Lingual Emergency Alert Dispatch Matrix (6 Languages)
[SUCCESS] All 7 automated integration test cases PASSED successfully!
```

---

## 🌐 Complete REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/healthz` | K8s readiness & liveness probe |
| `POST` | `/api/v1/telemetry` | IoT/MQTT hardware data ingestion |
| `GET` | `/api/v1/zones` | All NER vulnerable zones (GeoJSON FeatureCollection) |
| `GET` | `/api/v1/zones/{id}` | Zone detail + 24h telemetry history |
| `GET` | `/api/v1/nodes` | All active IoT sensor stations with latest readings |
| `GET` | `/api/v1/infrastructure` | Highways (LineStrings) + settlements (Points) GeoJSON |
| `PATCH` | `/api/v1/infrastructure/{id}` | Update road blockage / connectivity status |
| `POST` | `/api/v1/reports` | Submit geo-tagged citizen/field incident report |
| `GET` | `/api/v1/reports` | List crowd-sourced incident reports |
| `PATCH` | `/api/v1/reports/{id}/verify` | Verify or resolve a citizen report |
| `POST` | `/api/v1/simulation/what-if` | Climate stress-test (rainfall delta + pore pressure) |
| `GET` | `/api/v1/emergency/resources` | NDRF/SDRF battalion + excavator asset map |
| `GET` | `/api/v1/satellite/ndvi` | Sentinel-2 NDVI canopy anomaly scan result |
| `GET` | `/api/v1/alerts/history` | Emergency dispatch audit log from `alert_logs` |
| `WS` | `/ws/alerts` | Full-duplex real-time disaster telemetry stream |

---

## 🧮 AI / Geotechnical Models

### 1. Infinite Slope Factor of Safety
```
FoS = [c / (γ·H·sin α)] + cos α · (1 − u/(γ·H)) · tan φ / sin α
Failure condition: FoS < 1.0
```
`c` = cohesion (kPa) · `γ` = unit weight (kN/m³) · `H` = failure depth (m)  
`α` = slope angle · `φ` = friction angle · `u` = pore pressure (kPa)

### 2. Empirical Rainfall I-D Threshold
```
I_critical = 14.5 × D^(−0.25)    [NER calibrated α=14.5, β=0.25]
Breach threshold: I_actual / I_critical ≥ 1.0
```

### 3. Sentinel-2 NDVI Canopy Anomaly
```
NDVI = (NIR − RED) / (NIR + RED)
Anomaly = Baseline_NDVI − Current_NDVI
Alert flag: Anomaly > 0.30 (deforestation / illegal hill-cutting)
```

### 4. Hazard Classification Tiers

| Level | FoS | ML Prob | Lead Time | Action |
|-------|-----|---------|-----------|--------|
| 🟢 LOW | ≥ 1.5 | < 35% | > 48h | Routine monitoring |
| 🟡 MEDIUM | 1.25–1.5 | 35–60% | 12–24h | Advisory to district |
| 🟠 HIGH | 1.0–1.25 | 60–85% | 3–6h | Orange alert, evacuate prep |
| 🔴 CRITICAL | < 1.0 | ≥ 85% | 0–3h | Red alert — 6-language SMS/WhatsApp broadcast |

---

## 🌍 Multi-Lingual Emergency Broadcast Matrix

| Code | Language | States Covered |
|------|----------|---------------|
| `en` | English | National |
| `as` | অসমীয়া Assamese | Assam |
| `bn` | বাংলা Bengali | Tripura · Silchar (Assam) |
| `hi` | हिन्दी Hindi | Sikkim · National |
| `kha` | Khasi | Meghalaya |
| `miz` | Mizo | Mizoram |

---

## 🗄️ PostGIS Database Schema

| Table | Geometry | Description |
|-------|---------|-------------|
| `vulnerable_zones` | MultiPolygon (SRID 4326) | Risk corridor polygons — GiST indexed |
| `infrastructure_elements` | LineString / Point | Highways, bridges, settlements |
| `iot_sensor_nodes` | Point | Hardware telemetry station map |
| `sensor_telemetry` | — | Range-partitioned time-series (2026–2028) |
| `citizen_reports` | Point | Crowd-sourced geo-tagged incidents |
| `alert_logs` | — | Full dispatch audit history |
| `emergency_resources` | Point | NDRF / SDRF / excavator deployment |

---

## 📱 React Native Mobile App

```bash
cd mobile
npm install
npm run start   # Expo Go or bare workflow
```
**Features**: GPS geo-tagging · AsyncStorage offline queue · Background sync on reconnect · NetInfo connectivity detection

---

## ☸️ Kubernetes Enterprise Deployment

```bash
kubectl apply -f deployment/k8s/pvc.yaml
kubectl apply -f deployment/k8s/statefulset-db.yaml
kubectl apply -f deployment/k8s/redis.yaml
kubectl apply -f deployment/k8s/deployment-backend.yaml
kubectl apply -f deployment/k8s/deployment-frontend.yaml
kubectl apply -f deployment/k8s/ingress.yaml
```

---

## 📜 License & Acknowledgements

Developed for the **Smart India Hackathon (SIH ID: 26001)**  
Ministry of Development of North Eastern Region **(MDoNER)**  
National Disaster Management Authority **(NDMA)**  

> Tech Stack: FastAPI · PostgreSQL/PostGIS · Redis · Eclipse Mosquitto MQTT · React.js · React Native · scikit-learn · TensorFlow · Sentinel-2 NDVI · Docker · NGINX


---

## 🏛️ Enterprise System Architecture & Data Topology

```
+----------------------------------------------------------------------------------------------------+
|                                    EDGE INGESTION LAYER                                            |
|                                                                                                    |
|   [ IoT Hardware Sensor Nodes ]                      [ Citizen & Official Mobile Apps ]            |
|                │                                                        │                          |
|                ▼ (MQTT over UDP/TCP)                                    ▼ (Offline-First Storage)  |
|   [ Mosquitto Broker: 1883 ]                         [ React Native / AsyncStorage Queue ]         |
+----------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                      GATEWAY & ROUTING CORE                                        |
|                                                                                                    |
|                       [ NGINX Ingress Controller / Reverse Proxy Layer ]                          |
+----------------------------------------------------------------------------------------------------+
                                                 │
                 ┌───────────────────────────────┼───────────────────────────────┐
                 ▼                               ▼                               ▼
+--------------------------------+ +--------------------------------+ +------------------------------+
|        SERVICES FABRIC         | |       AI & PHYSICS RUNTIME     | |      NOTIFICATION CORE       |
|                                | |                                | |                              |
| [ FastAPI Telemetry Endpoint ] | | [ Infinite Slope FoS Engine ]  | | [ Multi-Lingual Matrix (6L)] |
| [ WebSocket Alert Broadcaster ]| | [ Rainfall I-D Threshold Node ]| | [ Indian DLT SMS Gateway ]   |
| [ MQTT Background Worker ]     | | [ Satellite NDVI Engine ]      | | [ WhatsApp Graph API ]       |
+--------------------------------+ +--------------------------------+ +------------------------------+
                 │                               │                               │
                 └───────────────────────────────┼───────────────────────────────┘
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                     STABILIZATION & CACHING                                        |
|                                                                                                    |
|                           [ Redis Key-Value Pub/Sub & Retry Queue ]                                |
+----------------------------------------------------------------------------------------------------+
                                                 │
                                                 ▼
+----------------------------------------------------------------------------------------------------+
|                                    SPATIAL PERSISTENCE ENGINE                                      |
|                                                                                                    |
|                   [ PostgreSQL 15 Engine with PostGIS Extension (SRID 4326) ]                      |
+----------------------------------------------------------------------------------------------------+
```

---

## 🧮 Mathematical & Geotechnical AI Pipeline

The platform uses a multi-tiered analytical architecture combining satellite remote sensing, empirical regional precipitation metrics, and deterministic limit-equilibrium geotechnical mechanics with a machine-learning Random Forest ensemble:

### 1. Empirical Rainfall Intensity-Duration ($I-D$) Threshold
Calculates whether instantaneous and antecedent downpours breach regional geological failure limits:
$$I_{\text{critical}} = \alpha \cdot D^{-\beta}$$
- **$\alpha = 14.5$** (Calibrated regional empirical coefficient for NER crystalline and sedimentary terrains)
- **$\beta = 0.25$** (Calibrated duration decay exponent)
- **$I$** = Hourly rainfall intensity ($\text{mm/hr}$), **$D$** = Rainfall continuous duration ($\text{hours}$)
- **Threshold Ratio** $= \frac{I_{\text{actual}}}{I_{\text{critical}}}$ ($\ge 1.0$ flags active meteorological breach).

### 2. Geotechnical Infinite Slope Factor of Safety ($FoS$)
Calculates the physical limit equilibrium state of the mountain slope:
$$FoS = \frac{c}{\gamma \cdot H \cdot \sin\alpha} + \cos\alpha \left( 1 - \frac{u}{\gamma \cdot H} \right) \frac{\tan\phi}{\sin\alpha}$$
Where:
- $c$ = Soil cohesion ($\text{kPa}$)
- $\gamma$ = Total unit weight of soil ($\text{kN/m}^3$)
- $H$ = Depth of failure shear plane ($\text{m}$)
- $\alpha$ = Mountain slope inclination angle ($\text{degrees}$)
- $\phi$ = Internal soil friction angle ($\text{degrees}$)
- $u$ = Pore water pressure ($\text{kPa}$, recorded in real time by piezometers)
- **Failure Condition**: $FoS < 1.0$ represents absolute slope shear failure.

### 3. Remote Sensing Satellite NDVI Anomaly Analysis
Processes optical & infrared multi-spectral bands (Sentinel-2) every 5 days to detect illegal hill-cutting, deforestation, and scarp exposure:
$$\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$$
$$\text{NDVI Anomaly} = \text{Baseline}_{\text{NDVI}} - \text{Current}_{\text{NDVI}}$$
An anomaly drop $> 0.30$ triggers an automated satellite excavation risk flag.

### 4. Hazard Classification Tiers
- **LOW ($FoS \ge 1.5, \text{Prob} < 0.35$)**: Routine monitoring; lead time $> 48\text{ hrs}$.
- **MEDIUM ($1.25 \le FoS < 1.5, 0.35 \le \text{Prob} < 0.60$)**: Advisory warning to district officials; lead time $12 - 24\text{ hrs}$.
- **HIGH ($1.0 \le FoS < 1.25, 0.60 \le \text{Prob} < 0.85$)**: Orange Alert — Prepare evacuation corridors; lead time $3 - 6\text{ hrs}$.
- **CRITICAL ($FoS < 1.0 \text{ or } \text{Prob} \ge 0.85$)**: Red Alert — Immediate multi-lingual SMS/WhatsApp broadcast to village heads; lead time $0 - 3\text{ hrs}$.

---

## 🗄️ PostGIS Spatial Database Schema

- `vulnerable_zones`: MultiPolygons (SRID 4326) with GiST indexing for high-risk corridors across NER (Guwahati-Shillong NH-6, Haflong / Jatinga NH-27, Gangtok NH-10, Aizawl NH-54, Kohima NH-29, Tawang NH-13, Sohra, Imphal NH-37).
- `infrastructure_elements`: LineStrings for highways and Points for settlements/bridges, tracking connectivity statuses (`open`, `blocked`, `partially_blocked`).
- `iot_sensor_nodes`: Points pinning IoT slope hardware telemetry stations.
- `sensor_telemetry`: Range-partitioned time-series ledger capturing moisture %, pore pressure ($u$), tilt $X/Y$, and rainfall intensity.
- `citizen_reports`: Crowdsourced geo-tagged reports with photo links and verification workflows.
- `emergency_resources`: NDRF/SDRF battalions, heavy excavators, and relief camps.

---

## 🌐 Multi-Lingual Alerting Matrix

Automated emergency broadcast templates support 6 regional languages:
1. **English (`en`)**
2. **Assamese (`as`)** — অসমীয়া
3. **Bengali (`bn`)** — বাংলা
4. **Hindi (`hi`)** — हिन्दी
5. **Khasi (`kha`)** — Meghalaya
6. **Mizo (`miz`)** — Mizoram

---

## 🚀 Quickstart: Running with Docker Compose

Spin up the complete containerized stack (PostGIS + Redis + Mosquitto MQTT + FastAPI Backend + MQTT Worker + React Nginx Dashboard):

```bash
# 1. Enter deployment folder
cd deployment

# 2. Build and launch all 6 services in detached mode
docker compose up --build -d

# 3. View container health and logs
docker compose logs -f
```

- **Web GIS Command Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI REST API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Mosquitto MQTT Broker**: `localhost:1883`
- **PostGIS Cluster**: `localhost:5432` (`mdoner_gis`)
- **Redis Cache & Failover**: `localhost:6379`

---

## 📡 Hardware Field Telemetry Simulation (MQTT)

Simulate a remote mountain IoT hardware sensor node transmitting readings over MQTT:

```bash
# Transmit MQTT payload to Mosquitto broker
docker exec -it mdoner-mqtt-broker mosquitto_pub \
  -t "mdoner/ner/sensor/IOT-MEGH-001-N01/telemetry" \
  -m '{"soil_moisture_percentage": 94.2, "tilt_x": 4.5, "tilt_y": -2.1, "pore_water_pressure": 44.0, "hourly_rainfall_intensity": 58.0}'
```

---

## 🧪 Automated Integration Testing Suite

Run the full automated test suite:

```bash
py tests/test_integration_pipeline.py
```

**Test Coverage**:
1. Infinite Slope Factor of Safety (Stable & Saturated failure states).
2. Empirical Rainfall $I-D$ Threshold ratio evaluation.
3. Composite AI/ML Risk Classification.
4. Sentinel-2 Satellite Multi-Spectral NDVI Normalization & Canopy Anomaly Detection.
5. Multi-Lingual Emergency Alert Dispatch Matrix (6 regional languages).

---

## 📱 React Native Mobile Offline-First Field App

To launch the mobile application for field officers:

```bash
cd mobile
npm install
npm run start
```
- Includes AsyncStorage local incident staging queue.
- NetInfo automatic connection transition listener.
- Background sync scheduler to flush pending reports when cellular towers reconnect.

---

## ☸️ Enterprise Kubernetes Deployment

Deploy to high-availability Kubernetes clusters in NER:

```bash
kubectl apply -f deployment/k8s/pvc.yaml
kubectl apply -f deployment/k8s/statefulset-db.yaml
kubectl apply -f deployment/k8s/redis.yaml
kubectl apply -f deployment/k8s/deployment-backend.yaml
kubectl apply -f deployment/k8s/deployment-frontend.yaml
kubectl apply -f deployment/k8s/ingress.yaml
```

---

## 📜 License & Acknowledgements
Developed for the **Smart India Hackathon (SIH ID: 26001)** under the Ministry of Development of North Eastern Region (MDoNER).

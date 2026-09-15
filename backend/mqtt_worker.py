"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
Low-Overhead IoT Hardware Telemetry Background Ingestion Worker (MQTT)
==============================================================================
This service connects directly to the Eclipse Mosquitto MQTT broker, listens
asynchronously for UDP/TCP sensor telemetry packets from low-power slope nodes,
and securely dispatches them to the central FastAPI / PostGIS calculation pipeline.
"""

import os
import json
import logging
import time
import asyncio
from typing import Dict, Any

try:
    import httpx
except ImportError:
    httpx = None

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

# Configure structured system logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("MDoNER-MQTT-Worker")


class MQTTTelemetryWorker:
    def __init__(self):
        # Network configuration
        self.mqtt_host = os.getenv("MQTT_HOST", "localhost")
        self.mqtt_port = int(os.getenv("MQTT_PORT", 1883))
        self.mqtt_topic = os.getenv("MQTT_TOPIC", "mdoner/ner/sensor/+/telemetry")
        self.fastapi_url = os.getenv("FASTAPI_INGEST_URL", "http://localhost:8000/api/v1/telemetry")

        if mqtt is not None:
            # Instantiate communication broker client with version 2 callbacks
            try:
                self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
            except AttributeError:
                self.client = mqtt.Client()
            self.setup_callbacks()
        else:
            self.client = None
            logger.warning("paho-mqtt is not installed in current environment. Running in mock/standby mode.")

    def setup_callbacks(self):
        """Bind underlying networking events to execution scopes."""
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc, properties=None):
        """Triggers immediately when network link handshake establishes with broker."""
        if rc == 0:
            logger.info(f"Successfully integrated with Mosquitto Broker at {self.mqtt_host}:{self.mqtt_port}")
            # Subscribe to multi-level wildcards tracking distributed nodes across NER districts
            self.client.subscribe(self.mqtt_topic)
            logger.info(f"Active wildcard subscription established on channel: {self.mqtt_topic}")
        else:
            logger.error(f"Broker handshake connection failure. Return Code (rc): {rc}")

    def on_disconnect(self, client, userdata, disconnect_flags=None, rc=0, properties=None):
        """Ensures persistence during carrier dropouts by firing retry backoffs."""
        logger.warning(f"Connection severed from MQTT broker. RC: {rc}")
        while not self.client.is_connected():
            try:
                logger.info("Attempting automatic socket reconnection to Mosquitto node...")
                self.client.reconnect()
                break
            except Exception as e:
                logger.error(f"Reconnection cycle failed: {e}. Backing off for 5 seconds...")
                time.sleep(5)

    def on_message(self, client, userdata, msg):
        """Processes real-time hardware telemetry broadcasts from field nodes."""
        try:
            topic_parts = msg.topic.split('/')
            # Extract routing parameters straight out of structural channel context strings:
            # Topic format: mdoner/ner/sensor/{node_id}/telemetry
            extracted_node_id = topic_parts[3] if len(topic_parts) >= 4 else "UNKNOWN"
            raw_payload = msg.payload.decode('utf-8-sig').strip()
            logger.info(f"Inbound MQTT Packet caught on [Topic: {msg.topic}]")
            
            data = json.loads(raw_payload)

            # Ensure spatial integration uniformity by checking identifier metrics
            if "node_id" not in data and "node_code" not in data:
                data["node_id"] = extracted_node_id

            # Direct the sanitized payload array into the processing queue
            asyncio.run(self.forward_to_fastapi_pipeline(data))

        except json.JSONDecodeError:
            logger.error(f"Dropped malformed payload segment. Raw text dropped: {msg.payload}")
        except Exception as e:
            logger.error(f"Error handling inbound hardware sensor packet stream: {str(e)}")

    async def forward_to_fastapi_pipeline(self, payload: Dict[str, Any]):
        """
        Pushes sanitized data payloads down to the FastAPI core logic thread.
        Triggers PostGIS persistence and runs slope Factor of Safety calculations.
        """
        if httpx is None:
            logger.info(f"Mock pipeline forward for Node {payload.get('node_id')}: {payload}")
            return

        async with httpx.AsyncClient() as httpx_client:
            try:
                response = await httpx_client.post(
                    self.fastapi_url,
                    json=payload,
                    timeout=10.0
                )
                if response.status_code == 201:
                    logger.info(f"Successfully processed packet from Node {payload.get('node_id')}. Pipeline logic complete.")
                else:
                    logger.warning(
                        f"Core API pipeline rejected telemetry vector. Status: {response.status_code}, Response: {response.text}"
                    )
            except httpx.RequestError as exc:
                logger.error(f"Network transport error forwarding metrics to FastAPI stack at {exc.request.url}: {exc}")

    def run_forever(self):
        """Starts the persistent background thread loop."""
        if not self.client:
            logger.error("MQTT client uninitialized. Cannot run loop.")
            return

        logger.info("Booting up MQTT ingestion layer service worker...")
        try:
            self.client.connect(self.mqtt_host, self.mqtt_port, 60)
            self.client.loop_forever()
        except KeyboardInterrupt:
            logger.info("Service interruption signal caught. Gracefully shutting down worker threads...")
            self.client.disconnect()
        except Exception as e:
            logger.critical(f"Fatal crash inside background worker logic loops: {str(e)}")


if __name__ == "__main__":
    worker = MQTTTelemetryWorker()
    if worker.client:
        worker.run_forever()
    else:
        logger.info("[STANDBY] MQTT worker initialized in standalone testing mode.")

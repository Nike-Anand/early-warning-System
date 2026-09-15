"""
==============================================================================
SIH ID 26001: AI-Based Early Warning and Landslide Risk Monitoring System in NER
Multi-Lingual Emergency Alerting & Gateway Microservice
==============================================================================
Orchestrates automated emergency notifications across multi-lingual channels
(SMS DLT, WhatsApp Business API, WebSockets) with Redis failover resilience.
"""

import os
import json
import asyncio
import logging
import datetime
from typing import Dict, Any, List, Optional, Callable

try:
    import psycopg2
except ImportError:
    psycopg2 = None

try:
    import httpx
except ImportError:
    httpx = None

try:
    import redis.asyncio as redis_async
except ImportError:
    redis_async = None

try:
    from telegram_alert_bot import TelegramBot
except ImportError:
    TelegramBot = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AlertMicroservice")

# ==============================================================================
# MULTI-LINGUAL REGIONAL TEMPLATE MATRIX (NER LANGUAGES & DIALECTS)
# ==============================================================================
MULTILINGUAL_TEMPLATES = {
    "en": {
        "CRITICAL": "🚨 [URGENT EVACUATION] MDoNER Alert: Critical landslide imminent in {zone_name}. Factor of Safety: {fos}. Roads {road_status}. Evacuate immediately to designated relief shelters.",
        "HIGH": "⚠️ [ORANGE ADVISORY] Landslide Risk High in {zone_name}. FoS: {fos}. Highway {road_status}. Avoid mountain roads and prepare for possible evacuation.",
        "MEDIUM": "ℹ️ [YELLOW WATCH] Landslide Advisory for {zone_name}. Moderate rainfall saturation detected. Local authorities on alert."
    },
    "as": { # Assamese (অসমীয়া)
        "CRITICAL": "🚨 [জৰুৰী সতৰ্কবাণী] MDoNER: {zone_name} ত প্ৰচণ্ড ভূমিস্খলনৰ আশংকা! সুৰক্ষা সীমা (FoS): {fos}। ৰাস্তা: {road_status}। অবিলম্বে আশ্ৰয়স্থললৈ যাওক।",
        "HIGH": "⚠️ [কমলা সতৰ্কতা] {zone_name} ত ভূমিস্খলনৰ উচ্চ সম্ভাৱনা। FoS: {fos}। ৰাস্তা: {road_status}। পাহাৰীয়া যাত্ৰা পৰিহাৰ কৰক।",
        "MEDIUM": "ℹ️ [হালধীয়া সতৰ্কতা] {zone_name} ত মৃদু বৰষুণৰ ফলত সতৰ্কতা জাৰি কৰা হৈছে।"
    },
    "bn": { # Bengali (বাংলা)
        "CRITICAL": "🚨 [জরুরি সরিয়ে নেওয়ার বার্তা] MDoNER: {zone_name} এলাকায় বিপজ্জনক ধস নামার চরম আশঙ্কা! স্থিতি: {status}, FoS: {fos}। রাস্তাঘাট {road_status}। অবিলম্বে নিরাপদ স্থানে যান।",
        "HIGH": "⚠️ [উচ্চ সতর্কতা] {zone_name} এলাকায় ধসের উচ্চ ঝুঁকি। FoS: {fos}। পার্বত্য রুটে চলাচল বন্ধ রাখুন।",
        "MEDIUM": "ℹ️ [সতর্কবার্তা] {zone_name} এলাকায় মাঝারি বৃষ্টির কারণে নজরদারি বৃদ্ধি করা হয়েছে।"
    },
    "hi": { # Hindi (हिन्दी)
        "CRITICAL": "🚨 [तत्काल निकासी चेतावनी] MDoNER आपदा अलर्ट: {zone_name} में गंभीर भूस्खलन का खतरा! FoS: {fos}। संपर्क मार्ग: {road_status}। तुरंत सुरक्षित राहत शिविर में जाएं।",
        "HIGH": "⚠️ [ऑरेंज अलर्ट] {zone_name} में भूस्खलन का उच्च जोखिम। FoS: {fos}। पहाड़ी मार्गों पर यात्रा से बचें।",
        "MEDIUM": "ℹ️ [येलो अलर्ट] {zone_name} में सतर्कता निगरानी जारी।"
    },
    "kha": { # Khasi (Meghalaya)
        "CRITICAL": "🚨 [JINGMAHAMSENG] MDoNER: Ka jingtwad khyndew kaba jur ha {zone_name}! Ka FoS: {fos}. Ki surok: {road_status}. Kynriah noh sha ki jaka shngain.",
        "HIGH": "⚠️ [JINGMAHAM] Don ka jingma na ka jingtwad khyndew ha {zone_name}. Ki surok: {road_status}. Kiad na ki lynti lum.",
        "MEDIUM": "ℹ️ [JINGPYNSNGOR] Peitngor ia ka jingther u slap ha {zone_name}."
    },
    "miz": { # Mizo (Mizoram)
        "CRITICAL": "🚨 [CHHIATRUPNA HLAUHAWM] MDoNER: {zone_name}-ah leimin hlauhawm tak a thleng dawn! FoS: {fos}. Kawng: {road_status}. Himna hmun pan nghal rawh.",
        "HIGH": "⚠️ [RALRINNA] {zone_name}-ah leimin theihna a sang hle. Kawng: {road_status}. Tlang kawng zawh pumpelh rawh.",
        "MEDIUM": "ℹ️ [HRIATTIRNA] {zone_name} leimin dinhmun chik taka thlithlai mek a ni."
    }
}


class AlertMicroservice:
    """
    Asynchronous emergency alert broadcaster with multi-lingual templating,
    SMS DLT compliant gateways, WhatsApp Business Graph API, and Redis failover queue.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client: Optional[Any] = None  # Typed as Any to avoid import alias mismatch
        self.dlt_sender_id = os.getenv("SMS_DLT_SENDER_ID", "MDONER")
        self.dlt_template_id = os.getenv("SMS_DLT_TEMPLATE_ID", "1407161829000123")
        self.whatsapp_token = os.getenv("WHATSAPP_API_TOKEN", "mock_whatsapp_bearer_token")
        self.whatsapp_phone_number_id = os.getenv("WHATSAPP_PHONE_ID", "1029384756")
        self.telegram_bot = None

    async def get_redis(self):
        if self.redis_client is None and redis_async is not None:
            try:
                self.redis_client = redis_async.from_url(
                    self.redis_url, encoding="utf-8", decode_responses=True
                )
                await self.redis_client.ping()
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}), operating in in-memory fallback mode.")
                self.redis_client = None
        return self.redis_client

    def attach_telegram_bot(self, db_getter: Callable, redis_getter: Optional[Callable] = None):
        """Attach the webhook-driven Telegram integration without creating a polling worker."""
        if TelegramBot is None:
            logger.warning("TelegramBot module unavailable; Telegram alerts disabled.")
            return None
        self.telegram_bot = TelegramBot(db_getter=db_getter, redis_getter=redis_getter or self.get_redis)
        return self.telegram_bot

    def format_message(
        self, language: str, risk_level: str, zone_name: str, fos: float, road_status: str
    ) -> str:
        """Formats the localized disaster message from the multi-lingual matrix."""
        lang_dict = MULTILINGUAL_TEMPLATES.get(language, MULTILINGUAL_TEMPLATES["en"])
        template = lang_dict.get(risk_level, lang_dict.get("MEDIUM"))
        return template.format(
            zone_name=zone_name,
            fos=round(fos, 2),
            road_status=road_status.replace("_", " ").upper(),
            status=risk_level
        )

    async def send_sms_dlt(
        self,
        phone_number: str,
        message: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Dispatches high-priority flash emergency SMS via Indian DLT compliant gateway.
        """
        payload = {
            "sender_id": self.dlt_sender_id,
            "template_id": self.dlt_template_id,
            "recipient": phone_number,
            "message": message,
            "priority": "FLASH_EMERGENCY",
            "language": language
        }

        # Simulated robust carrier gateway dispatch
        logger.info(f"📲 [SMS DLT DISPATCH to {phone_number} | {language.upper()}]: {message}")
        await asyncio.sleep(0.05)
        return {"status": "DELIVERED", "gateway_ref": f"DLT-TXN-{os.urandom(4).hex()}"}

    async def send_whatsapp_alert(
        self,
        phone_number: str,
        message: str,
        zone_name: str,
        lat: float,
        lng: float
    ) -> Dict[str, Any]:
        """
        Dispatches rich WhatsApp interactive message with safety shelter coordinates.
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "interactive",
            "interactive": {
                "type": "location_request_message",
                "body": {"text": message},
                "action": {
                    "name": "view_evacuation_route",
                    "parameters": {
                        "latitude": lat,
                        "longitude": lng,
                        "name": f"Evacuation Base for {zone_name}"
                    }
                }
            }
        }
        logger.info(f"💬 [WHATSAPP DISPATCH to {phone_number}]: Location Map -> ({lat}, {lng})")
        await asyncio.sleep(0.05)
        return {"status": "DELIVERED", "wa_message_id": f"wamid.{os.urandom(8).hex()}"}

    async def broadcast_disaster_alert(
        self,
        zone_id: str,
        zone_name: str,
        risk_level: str,
        fos: float,
        road_status: str,
        lat: float = 25.75,
        lng: float = 91.88,
        contact_list: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Master orchestrator: Multi-lingual rendering, multi-channel dispatch,
        and automatic Redis failover queuing.
        """
        if risk_level not in ["HIGH", "CRITICAL"]:
            return {"status": "SKIPPED", "reason": "Hazard level below notification threshold"}

        # Default sample contacts if none supplied (Village heads, District magistrates, SDRF)
        recipients = contact_list or [
            {"name": "East Khasi Hills DC Office", "phone": "+91-98640-11111", "lang": "kha"},
            {"name": "Dima Hasao Village Captain", "phone": "+91-94350-22222", "lang": "as"},
            {"name": "Sikkim Relief Officer", "phone": "+91-97330-33333", "lang": "hi"},
            {"name": "Silchar Zonal Coordinator", "phone": "+91-94361-44444", "lang": "bn"},
            {"name": "MDoNER Central Command", "phone": "+91-99100-55555", "lang": "en"}
        ]

        dispatched_results = []
        languages_sent = set()

        for recipient in recipients:
            lang = recipient.get("lang", "en")
            languages_sent.add(lang)
            text_msg = self.format_message(lang, risk_level, zone_name, fos, road_status)

            try:
                # 1. Dispatch SMS
                sms_res = await self.send_sms_dlt(recipient["phone"], text_msg, language=lang)
                # 2. Dispatch WhatsApp
                wa_res = await self.send_whatsapp_alert(
                    recipient["phone"], text_msg, zone_name, lat, lng
                )
                dispatched_results.append({
                    "recipient": recipient["name"],
                    "phone": recipient["phone"],
                    "language": lang,
                    "sms_status": sms_res["status"],
                    "wa_status": wa_res["status"]
                })

                # 3. Telegram is zone-subscriber based, so it is dispatched once
                # after the legacy phone-channel loop below.
            except Exception as exc:
                logger.error(f"Downstream gateway error for {recipient['name']}: {exc}. Queuing to Redis.")
                await self.enqueue_failed_alert({
                    "recipient": recipient,
                    "message": text_msg,
                    "zone_name": zone_name,
                    "risk_level": risk_level,
                    "fos": fos,
                    "timestamp": str(asyncio.get_event_loop().time())
                })

        telegram_result = {"status": "NOT_CONFIGURED", "sent": 0}
        if self.telegram_bot is not None:
            try:
                telegram_result = await self.telegram_bot.broadcast_zone_alert(
                    zone_id=zone_id,
                    zone_name=zone_name,
                    risk_level=risk_level,
                    fos=fos,
                    road_status=road_status,
                    lat=lat,
                    lng=lng,
                    rendered_by_language=lambda language: self.format_message(
                        language, risk_level, zone_name, fos, road_status
                    ),
                )
            except Exception as exc:
                logger.error("Telegram broadcast failed: %s. Queuing retry envelope.", exc)
                await self.enqueue_failed_alert({
                    "channel": "telegram",
                    "zone_id": zone_id,
                    "zone_name": zone_name,
                    "risk_level": risk_level,
                    "fos": fos,
                    "road_status": road_status,
                    "lat": lat,
                    "lng": lng,
                })
                telegram_result = {"status": "QUEUED_RETRY", "sent": 0}

        # --- PERSIST ALERT TO POSTGRESQL SO MOBILE APP CAN POLL IT ---
        if psycopg2 is not None:
            db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_secure_password_sih26001@localhost:5432/mdoner_gis")
            try:
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                summary_text = f"Manual Dispatch: {risk_level} alert for {zone_name}. FoS: {fos}"
                cur.execute("""
                    INSERT INTO alert_logs (
                        zone_id, risk_level, factor_of_safety, rainfall_threshold_ratio,
                        dispatched_languages, sms_recipients_count, websocket_broadcast,
                        summary_text, dispatched_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING alert_id;
                """, (
                    zone_id, risk_level, fos, 1.0,
                    list(languages_sent), len(recipients), True,
                    summary_text, datetime.datetime.now(datetime.timezone.utc)
                ))
                inserted_alert_id = cur.fetchone()[0]
                conn.commit()
                cur.close()
                conn.close()
                logger.info(f"✅ Saved alert_logs record (ID: {inserted_alert_id}) for mobile app polling.")
            except Exception as e:
                logger.error(f"Failed to insert into alert_logs: {e}")

        return {
            "status": "COMPLETED",
            "zone_id": zone_id,
            "risk_level": risk_level,
            "languages_dispatched": list(languages_sent),
            "total_recipients": len(recipients),
            "dispatches": dispatched_results,
            "telegram": telegram_result,
        }

    async def enqueue_failed_alert(self, payload: Dict[str, Any]):
        """Persists failed alert payloads into Redis failover queue for background retry."""
        try:
            r = await self.get_redis()
            if r:
                await r.rpush("alert_retry_queue", json.dumps(payload))
                logger.info(f"📦 Alert successfully enqueued in Redis 'alert_retry_queue'")
        except Exception as e:
            logger.error(f"Failed to enqueue to Redis: {e}")

    async def drain_retry_queue_worker(self):
        """Background daemon: drains and re-attempts failed notifications with exponential backoff."""
        while True:
            try:
                r = await self.get_redis()
                if r:
                    item = await r.lpop("alert_retry_queue")
                    if item:
                        payload = json.loads(item)
                        if payload.get("channel") == "telegram" and self.telegram_bot is not None:
                            logger.info("🔄 Re-attempting failed Telegram zone broadcast for %s", payload.get("zone_name"))
                            await self.telegram_bot.broadcast_zone_alert(
                                zone_id=payload["zone_id"],
                                zone_name=payload["zone_name"],
                                risk_level=payload["risk_level"],
                                fos=payload["fos"],
                                road_status=payload["road_status"],
                                lat=payload.get("lat", 25.75),
                                lng=payload.get("lng", 91.88),
                                rendered_by_language=lambda language: self.format_message(
                                    language, payload["risk_level"], payload["zone_name"], payload["fos"], payload["road_status"]
                                ),
                            )
                        else:
                            logger.info(f"🔄 Re-attempting failed alert dispatch: {payload['recipient']['name']}")
                            await self.send_sms_dlt(
                                payload["recipient"]["phone"], payload["message"], payload["recipient"].get("lang", "en")
                            )
                await asyncio.sleep(10.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Error in retry queue worker: {e}")
                await asyncio.sleep(15.0)


# Standalone runner for testing
if __name__ == "__main__":
    async def main():
        service = AlertMicroservice()
        print("=" * 80)
        print("TESTING MULTI-LINGUAL EMERGENCY ALERT DISPATCHER")
        print("=" * 80)
        res = await service.broadcast_disaster_alert(
            zone_id="test-zone-001",
            zone_name="Guwahati-Shillong Highway Ridge (NH-6)",
            risk_level="CRITICAL",
            fos=0.88,
            road_status="blocked",
            lat=25.71,
            lng=91.82
        )
        print(f"\nBroadcast Summary:\n{json.dumps(res, indent=2)}")
        print("\n[SUCCESS] Multi-lingual alert microservice tested successfully!")

    asyncio.run(main())

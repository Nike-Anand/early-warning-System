"""
NexusRisk Telegram Alert Bot

Webhook-driven Telegram integration for SIH 26001.
- Subscribers are stored in PostgreSQL (chat_id <-> zone_id <-> language <-> role).
- Alerts are dispatched by AlertMicroservice, not by a polling loop.
- Webhook commands provide two-way feedback into the existing database.
"""

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("NexusRiskTelegram")

VALID_LANGS = {"en", "hi", "as", "bn", "kha", "miz"}
VALID_ROLES = {"citizen", "official"}

BOT_TEXTS = {
    "en": {
        "start": (
            "🌐 NEXUSRISK ALERT BOT\n\n"
            "Real-time landslide early warnings for monitored zones.\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe\n\n"
            "You can also share your location to auto-map the nearest zone."
        ),
        "subscribed": "✅ You are subscribed to {zone_name} ({zone_code}).",
        "unsubscribed": "✅ Removed {count} active subscription(s).",
        "zone_not_found": "❌ Zone not found. Use the zone code shown in the command center.",
        "no_zone_location": "⚠️ No monitored zone could be matched to this location.",
        "evacuation_route": "🗺 Evacuation Route",
"im_safe": "✅ I'm Safe",
"report_ground": "📩 Report Ground Condition",
        "status": (
            "🌐 NEXUSRISK STATUS\n\n"
            "📡 Active sensors: {sensors}\n"
            "🔴 Critical zones: {critical}\n"
            "🟠 High-risk zones: {high}"
        ),
        "no_critical": "✅ No HIGH/CRITICAL zones are currently active.",
        "critical_title": "🚨 ACTIVE LANDSLIDE RISKS",
        "fos": "FoS: {fos}",
        "update_status_usage": "Usage: /update_status RESOURCE_ID available|deployed",
        "safe_callback": "✅ Safety status recorded.",
"safe_response": "✅ Your safety response has been recorded for the response team.",
"location_callback": "Send your live location in the next message.",
"ground_report_prompt": "📍 Please share your current location. It will be stored as a field/citizen ground-condition report.",
"action_received": "Action received.",
        "language_changed": "✅ Alert language set to {lang}.",
        "unsupported_language": "Supported: en, hi, as, bn, kha, miz",
        "resource_updated": "✅ Resource status updated: {resource} → {status}",
        "resource_not_found": "❌ Resource not found.",
        "ground_report_received": "✅ Ground condition report received. Report ID: {report_id}",
        "share_location": "📍 Please share your current location.",
        "unknown_command": "Unknown command. Use /start to see available commands.",
    },

    "hi": {
        "start": (
            "🌐 NEXUSRISK अलर्ट बॉट\n\n"
            "वास्तविक समय भूस्खलन चेतावनियाँ।\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe"
        ),
        "subscribed": "✅ आपने {zone_name} ({zone_code}) की सदस्यता ले ली है।",
        "unsubscribed": "✅ {count} सक्रिय सदस्यताएँ हटा दी गईं।",
        "zone_not_found": "❌ ज़ोन नहीं मिला।",
        "no_zone_location": "⚠️ इस स्थान से कोई निगरानी वाला ज़ोन नहीं मिला।",
        "evacuation_route": "🗺 निकासी मार्ग",
"im_safe": "✅ मैं सुरक्षित हूँ",
"report_ground": "📩 भूमि स्थिति रिपोर्ट करें",
"status": (
    "🌐 NEXUSRISK स्थिति\n\n"
    "📡 सक्रिय सेंसर: {sensors}\n"
    "🔴 गंभीर ज़ोन: {critical}\n"
    "🟠 उच्च-जोखिम ज़ोन: {high}"
),
"critical_title": "🚨 सक्रिय भूस्खलन जोखिम",
"fos": "FoS: {fos}",
"update_status_usage": "उपयोग: /update_status RESOURCE_ID available|deployed",
"safe_callback": "✅ सुरक्षा स्थिति दर्ज की गई।",
"safe_response": "✅ आपकी सुरक्षा प्रतिक्रिया प्रतिक्रिया टीम के लिए दर्ज कर ली गई है।",
"location_callback": "अगले संदेश में अपना लाइव स्थान साझा करें।",
"ground_report_prompt": "📍 कृपया अपना वर्तमान स्थान साझा करें। इसे फील्ड/नागरिक भूमि-स्थिति रिपोर्ट के रूप में संग्रहीत किया जाएगा।",
"action_received": "कार्रवाई प्राप्त हुई।",
        "language_changed": "✅ अलर्ट भाषा {lang} पर सेट की गई है।",
        "unsupported_language": "समर्थित भाषाएँ: en, hi, as, bn, kha, miz",
        "resource_not_found": "❌ संसाधन नहीं मिला।",
        "ground_report_received": "✅ भूमि स्थिति रिपोर्ट प्राप्त हुई। रिपोर्ट ID: {report_id}",
        "share_location": "📍 कृपया अपना वर्तमान स्थान साझा करें।",
        "unknown_command": "अज्ञात कमांड। /start का उपयोग करें।",
    },

    "as": {
        "start": (
            "🌐 NEXUSRISK এলাৰ্ট বট\n\n"
            "বাস্তৱ সময়ৰ ভূমিস্খলন সতৰ্কবাণী।\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe"
        ),
        "subscribed": "✅ আপুনি {zone_name} ({zone_code})-ত চাবস্ক্ৰাইব কৰিছে।",
        "unsubscribed": "✅ {count} টা সক্ৰিয় চাবস্ক্ৰিপচন আঁতৰোৱা হৈছে।",
        "zone_not_found": "❌ জ'ন পোৱা নগ'ল।",
        "no_zone_location": "⚠️ এই অৱস্থানৰ সৈতে কোনো নিৰীক্ষণাধীন জ'ন মিলোৱা নগ'ল।",
        "evacuation_route": "🗺 উদ্ধাৰ পথ",
"im_safe": "✅ মই নিৰাপদ",
"report_ground": "📩 ভূমিৰ অৱস্থা জনাওক",
"status": (
    "🌐 NEXUSRISK স্থিতি\n\n"
    "📡 সক্ৰিয় চেন্সৰ: {sensors}\n"
    "🔴 সংকটজনক জ'ন: {critical}\n"
    "🟠 উচ্চ-ঝুঁকিপূৰ্ণ জ'ন: {high}"
),
"critical_title": "🚨 সক্ৰিয় ভূমিস্খলনৰ আশংকা",
"fos": "FoS: {fos}",
"update_status_usage": "ব্যৱহাৰ: /update_status RESOURCE_ID available|deployed",
"safe_callback": "✅ সুৰক্ষা অৱস্থা পঞ্জীয়ন কৰা হৈছে।",
"safe_response": "✅ আপোনাৰ সুৰক্ষা সঁহাৰি প্ৰতিক্ৰিয়া দলৰ বাবে পঞ্জীয়ন কৰা হৈছে।",
"location_callback": "পৰৱৰ্তী বাৰ্তাত আপোনাৰ লাইভ অৱস্থান শ্বেয়াৰ কৰক।",
"ground_report_prompt": "📍 অনুগ্ৰহ কৰি আপোনাৰ বৰ্তমানৰ অৱস্থান শ্বেয়াৰ কৰক। ইয়াক ফিল্ড/নাগৰিক মাটিৰ অৱস্থাৰ প্ৰতিবেদন হিচাপে সংৰক্ষণ কৰা হ'ব।",
"action_received": "কাৰ্য্য গ্ৰহণ কৰা হৈছে।",
        "language_changed": "✅ এলাৰ্টৰ ভাষা {lang} লৈ সলনি কৰা হৈছে।",
        "unsupported_language": "সমৰ্থিত ভাষা: en, hi, as, bn, kha, miz",
        "resource_not_found": "❌ সম্পদ পোৱা নগ'ল।",
        "ground_report_received": "✅ মাটিৰ অৱস্থাৰ প্ৰতিবেদন পোৱা গৈছে। Report ID: {report_id}",
        "share_location": "📍 অনুগ্ৰহ কৰি আপোনাৰ বৰ্তমানৰ অৱস্থান শ্বেয়াৰ কৰক।",
        "unknown_command": "অজ্ঞাত কমাণ্ড। /start ব্যৱহাৰ কৰক।",
    },

    "bn": {
        "start": (
            "🌐 NEXUSRISK অ্যালার্ট বট\n\n"
            "রিয়েল-টাইম ভূমিধস সতর্কতা।\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe"
        ),
        "subscribed": "✅ আপনি {zone_name} ({zone_code})-এ সাবস্ক্রাইব করেছেন।",
        "unsubscribed": "✅ {count}টি সক্রিয় সাবস্ক্রিপশন সরানো হয়েছে।",
        "zone_not_found": "❌ জোন পাওয়া যায়নি।",
        "no_zone_location": "⚠️ এই অবস্থানের সাথে কোনো পর্যবেক্ষণাধীন জোন মেলেনি।",
        "evacuation_route": "🗺 নিরাপদ সরিয়ে নেওয়ার পথ",
"im_safe": "✅ আমি নিরাপদ",
"report_ground": "📩 ভূমির অবস্থা জানান",
"status": (
    "🌐 NEXUSRISK স্থিতি\n\n"
    "📡 সক্রিয় সেন্সর: {sensors}\n"
    "🔴 সংকটপূর্ণ জোন: {critical}\n"
    "🟠 উচ্চ-ঝুঁকির জোন: {high}"
),
"critical_title": "🚨 সক্রিয় ভূমিধসের ঝুঁকি",
"fos": "FoS: {fos}",
"update_status_usage": "ব্যবহার: /update_status RESOURCE_ID available|deployed",
"safe_callback": "✅ নিরাপত্তার অবস্থা নথিভুক্ত করা হয়েছে।",
"safe_response": "✅ আপনার নিরাপত্তা প্রতিক্রিয়া প্রতিক্রিয়া দলের জন্য নথিভুক্ত করা হয়েছে।",
"location_callback": "পরবর্তী বার্তায় আপনার লাইভ অবস্থান শেয়ার করুন।",
"ground_report_prompt": "📍 অনুগ্রহ করে আপনার বর্তমান অবস্থান শেয়ার করুন। এটি ফিল্ড/নাগরিক ভূমির অবস্থার রিপোর্ট হিসেবে সংরক্ষণ করা হবে।",
"action_received": "কার্যক্রম গ্রহণ করা হয়েছে।",
        "language_changed": "✅ অ্যালার্ট ভাষা {lang} সেট করা হয়েছে।",
        "unsupported_language": "সমর্থিত ভাষা: en, hi, as, bn, kha, miz",
        "resource_not_found": "❌ রিসোর্স পাওয়া যায়নি।",
        "ground_report_received": "✅ ভূমির অবস্থার রিপোর্ট পাওয়া গেছে। Report ID: {report_id}",
        "share_location": "📍 অনুগ্রহ করে আপনার বর্তমান অবস্থান শেয়ার করুন।",
        "unknown_command": "অজানা কমান্ড। /start ব্যবহার করুন।",
    },

    "kha": {
        "start": (
            "🌐 NEXUSRISK ALERT BOT\n\n"
            "Ki jingmaham jingtwad khyndew ha ka por kaba shisha.\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe"
        ),
        "subscribed": "✅ Phi la subscribe sha {zone_name} ({zone_code}).",
        "unsubscribed": "✅ La weng noh {count} subscription(s).",
        "zone_not_found": "❌ Ym lap ia ka zone.",
        "no_zone_location": "⚠️ Ym lap ïa kano ka zone ba la peitngor na kane ka jaka.",
        "evacuation_route": "🗺 Ka lynti jingïapher sha ka jaka shngain",
"im_safe": "✅ Nga shngain",
"report_ground": "📩 Report ïa ka jinglong ka khyndew",
"status": (
    "🌐 NEXUSRISK STATUS\n\n"
    "📡 Ki sensor kiba treikam: {sensors}\n"
    "🔴 Ki zone kiba don ha ka jingma kaba jur: {critical}\n"
    "🟠 Ki zone kiba don ha ka jingma kaba kham heh: {high}"
),
"critical_title": "🚨 Ki jingma jong ka jingtwad khyndew kiba dang treikam",
"fos": "FoS: {fos}",
"update_status_usage": "Ka jingpyndonkam: /update_status RESOURCE_ID available|deployed",
"safe_callback": "✅ La pynrung kyrteng ia ka jinglong ba shngain.",
"safe_response": "✅ La pynrung kyrteng ia ka jubab jong phi sha ka kynhun ba ai jingïarap.",
"location_callback": "Sngewbha phah ia ka live location jong phi ha ka khubor kaba bud.",
"ground_report_prompt": "📍 Sngewbha phah ia ka jaka kaba phi don mynta. Yn buh ia ka kum ka field/citizen ground-condition report.",
"action_received": "La ioh ia ka kam.",
        "language_changed": "✅ Ka ktien alert la bujli sha {lang}.",
        "unsupported_language": "Ki ktien ba kyrshan: en, hi, as, bn, kha, miz",
        "resource_not_found": "❌ Ym lap ia ka resource.",
        "ground_report_received": "✅ La ioh ia ka ground report. Report ID: {report_id}",
        "share_location": "📍 Sngewbha phah ia ka jaka jong phi.",
        "unknown_command": "Command bym tip. Pyndonkam /start.",
    },

    "miz": {
        "start": (
            "🌐 NEXUSRISK ALERT BOT\n\n"
            "Leimin hlauhawm hriatna hun taka pek.\n\n"
            "/subscribe ZONE_CODE\n"
            "/lang en|hi|as|bn|kha|miz\n"
            "/status\n"
            "/critical\n"
            "/unsubscribe"
        ),
        "subscribed": "✅ {zone_name} ({zone_code}) ah subscribe na i.",
        "unsubscribed": "✅ Subscription {count} chu paih a ni.",
        "zone_not_found": "❌ Zone hmuh theih loh.",
        "no_zone_location": "⚠️ He hmun hi monitored zone nen inlaichin theih a ni lo.",
        "evacuation_route": "🗺 Himna hmun kalna kawng",
"im_safe": "✅ Ka him",
"report_ground": "📩 Lei dinhmun report rawh",
"status": (
    "🌐 NEXUSRISK DINHHLUN\n\n"
    "📡 Sensor hman mek: {sensors}\n"
    "🔴 Critical zone: {critical}\n"
    "🟠 Hlauhawm sang zone: {high}"
),
"critical_title": "🚨 Hriatna hlauhawm dang awm mek",
"fos": "FoS: {fos}",
"update_status_usage": "Hman dan: /update_status RESOURCE_ID available|deployed",
"safe_callback": "✅ Himanna dinhmun chu record a ni.",
"safe_response": "✅ I himanna chhanna hi response team tan record a ni.",
"location_callback": "Message lo ah i live location share rawh.",
"ground_report_prompt": "📍 Tūna i awmna hmun share rawh. Field/citizen ground-condition report atan dah a ni ang.",
"action_received": "Action dawng a ni.",
        "language_changed": "✅ Alert language hi {lang} ah dah a ni.",
        "unsupported_language": "Language support: en, hi, as, bn, kha, miz",
        "resource_not_found": "❌ Resource hmuh theih loh.",
        "ground_report_received": "✅ Ground condition report dawng ta. Report ID: {report_id}",
        "share_location": "📍 Tūna i awmna hmun share rawh.",
        "unknown_command": "Command hriat loh. /start hmang rawh.",
    },
}


class TelegramBot:
    def __init__(self, db_getter, redis_getter=None):
        self.db_getter = db_getter
        self.redis_getter = redis_getter
        self.token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL", "").strip()
        self.webhook_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()
        self.enabled = bool(self.token)
        self.api_base = f"https://api.telegram.org/bot{self.token}" if self.token else ""
        self.send_semaphore = asyncio.Semaphore(25)

    async def _api(self, method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return {"ok": False, "disabled": True}
        url = f"{self.api_base}/{method}"
        async with self.send_semaphore:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                if not data.get("ok"):
                    raise RuntimeError(f"Telegram {method} failed: {data}")
                return data

    async def set_webhook(self) -> Dict[str, Any]:
        if not self.enabled:
            return {"ok": False, "disabled": True}
        if not self.webhook_url:
            logger.info("Telegram bot enabled but TELEGRAM_WEBHOOK_URL is not configured; webhook not set.")
            return {"ok": False, "reason": "TELEGRAM_WEBHOOK_URL missing"}
        payload: Dict[str, Any] = {
            "url": self.webhook_url,
            "allowed_updates": ["message", "callback_query"],
        }
        if self.webhook_secret:
            payload["secret_token"] = self.webhook_secret
        result = await self._api("setWebhook", payload)
        logger.info("Telegram webhook configured: %s", self.webhook_url)
        return result

    async def delete_webhook(self) -> Dict[str, Any]:
        if not self.enabled:
            return {"ok": False, "disabled": True}
        return await self._api("deleteWebhook", {})

    def _connect(self):
        return self.db_getter()

    def _get_user_language(self, chat_id: str) -> str:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cur.execute(
                """
                SELECT language
                FROM telegram_user_preferences
                WHERE chat_id = %s
                """,
                (chat_id,),
            )

            row = cur.fetchone()

            if row and row.get("language") in VALID_LANGS:
                return row["language"]

            return "en"

        finally:
            cur.close()
            conn.close()


    def _set_user_language(
        self,
        chat_id: str,
        language: str,
        role: str = "citizen",
    ) -> None:
        conn = self._connect()
        cur = conn.cursor()

        try:
            cur.execute(
                """
                INSERT INTO telegram_user_preferences
                    (chat_id, language, role, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (chat_id)
                DO UPDATE SET
                    language = EXCLUDED.language,
                    role = EXCLUDED.role,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (chat_id, language, role),
            )
            conn.commit()

        finally:
            cur.close()
            conn.close()

    def _t(self, chat_id: str, key: str, **kwargs) -> str:
        lang = self._get_user_language(chat_id)

        text = BOT_TEXTS.get(
            lang,
            BOT_TEXTS["en"]
        ).get(
            key,
            BOT_TEXTS["en"].get(key, key)
        )

        return text.format(**kwargs)
    def _store_subscription(self, chat_id: str, zone_id: Optional[str], language: str, role: str) -> Dict[str, Any]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                INSERT INTO telegram_subscribers (chat_id, zone_id, language, role, active)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (chat_id, zone_id)
                DO UPDATE SET language = EXCLUDED.language, role = EXCLUDED.role, active = TRUE,
                              updated_at = CURRENT_TIMESTAMP
                RETURNING subscriber_id, chat_id, zone_id, language, role, active;
                """,
                (chat_id, zone_id, language, role),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            cur.close()
            conn.close()

    def _unsubscribe(self, chat_id: str, zone_id: Optional[str] = None) -> int:
        conn = self._connect()
        cur = conn.cursor()
        try:
            if zone_id:
                cur.execute(
                    "UPDATE telegram_subscribers SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE chat_id=%s AND zone_id=%s",
                    (chat_id, zone_id),
                )
            else:
                cur.execute(
                    "UPDATE telegram_subscribers SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE chat_id=%s",
                    (chat_id,),
                )
            changed = cur.rowcount
            conn.commit()
            return changed
        finally:
            cur.close()
            conn.close()

    def _resolve_zone(self, token: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                SELECT zone_id, zone_code, zone_name, state, district,
                       ST_X(ST_Centroid(geom)) AS lng,
                       ST_Y(ST_Centroid(geom)) AS lat
                FROM vulnerable_zones
                WHERE zone_code ILIKE %s OR zone_name ILIKE %s OR zone_id::text = %s
                LIMIT 1;
                """,
                (token, token, token),
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            cur.close()
            conn.close()

    def _resolve_zone_from_location(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                SELECT zone_id, zone_code, zone_name, state, district,
                       ST_Distance(
                         geom::geography,
                         ST_SetSRID(ST_Point(%s, %s), 4326)::geography
                       ) AS distance_m
                FROM vulnerable_zones
                ORDER BY distance_m ASC
                LIMIT 1;
                """,
                (longitude, latitude),
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            cur.close()
            conn.close()

    def _nearest_available_resource(self, zone_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cur.execute(
                """
                SELECT
                    resource_id,
                    resource_name,
                    unit_type,
                    stationed_location,
                    personnel_count,
                    contact_officer,
                    contact_phone,
                    availability_status,
                    ST_X(geom) AS lng,
                    ST_Y(geom) AS lat,
                    ST_Distance(
                        geom::geography,
                        (
                            SELECT geom::geography
                            FROM vulnerable_zones
                            WHERE zone_id = %s
                        )
                    ) AS distance_m
                FROM emergency_resources
                WHERE availability_status = 'available'
                  AND unit_type <> 'RELIEF_CAMP'
                ORDER BY distance_m ASC
                LIMIT 1;
                """,
                (zone_id,),
            )

            row = cur.fetchone()
            return dict(row) if row else None

        finally:
            cur.close()
            conn.close()

        

    def _nearest_shelter(self, zone_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                SELECT resource_id, resource_name, stationed_location, personnel_count,
                       ST_X(geom) AS lng, ST_Y(geom) AS lat, is_deployed
                FROM emergency_resources
                WHERE unit_type = 'RELIEF_CAMP' AND is_deployed = FALSE
                ORDER BY ST_Distance(
                    geom::geography,
                    (SELECT geom::geography FROM vulnerable_zones WHERE zone_id = %s)
                ) ASC
                LIMIT 1;
                """,
                (zone_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            cur.close()
            conn.close()

    def subscribers_for_zone(self, zone_id: str) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                SELECT chat_id, language, role
                FROM telegram_subscribers
                WHERE zone_id = %s AND active = TRUE;
                """,
                (zone_id,),
            )
            return [dict(row) for row in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def _active_critical_zones(self) -> List[Dict[str, Any]]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                SELECT zone_code, zone_name, state, district, current_fos, current_risk_status
                FROM vulnerable_zones
                WHERE current_risk_status IN ('HIGH','CRITICAL')
                ORDER BY CASE current_risk_status WHEN 'CRITICAL' THEN 1 ELSE 2 END, zone_name;
                """
            )
            return [dict(row) for row in cur.fetchall()]
        finally:
            cur.close()
            conn.close()

    def _system_status(self) -> Dict[str, Any]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT COUNT(*) AS total FROM iot_sensor_nodes WHERE is_active = TRUE;")
            sensor_total = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) AS total FROM vulnerable_zones WHERE current_risk_status='CRITICAL';")
            critical = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) AS total FROM vulnerable_zones WHERE current_risk_status='HIGH';")
            high = cur.fetchone()["total"]
            return {"sensors": sensor_total, "critical": critical, "high": high}
        finally:
            cur.close()
            conn.close()

    def _record_safe_event(self, chat_id: str, zone_id: Optional[str], user: Dict[str, Any]) -> None:
        conn = self._connect()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO telegram_feedback_events (chat_id, zone_id, feedback_type, payload)
                VALUES (%s, %s, 'I_M_SAFE', %s::jsonb);
                """,
                (chat_id, zone_id, json.dumps({"user_id": user.get("id"), "username": user.get("username")})),
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def _record_ground_report(self, chat_id: str, latitude: float, longitude: float, user: Dict[str, Any]) -> Dict[str, Any]:
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute(
                """
                INSERT INTO citizen_reports (
                    reporter_name, category, severity_estimate, geom, landmark_description, offline_sync_id
                ) VALUES (
                    %s, 'GROUND_CRACK', 'MEDIUM', ST_SetSRID(ST_Point(%s, %s), 4326), %s, %s
                ) RETURNING report_id;
                """,
                (
                    user.get("first_name") or user.get("username") or "Telegram Citizen",
                    longitude,
                    latitude,
                    "Telegram field report - user submitted location",
                    f"telegram:{chat_id}:{int(asyncio.get_event_loop().time() * 1000)}",
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
        finally:
            cur.close()
            conn.close()

    def _update_resource_status(
        self,
        resource_id: str,
        status: str
    ) -> Optional[Dict[str, Any]]:
        normalized_status = status.lower().strip()

        if normalized_status not in ("deployed", "available"):
            return None

        is_deployed = normalized_status == "deployed"

        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        try:
            cur.execute(
                """
                UPDATE emergency_resources
                SET
                    is_deployed = %s,
                    availability_status = %s,
                    last_verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE resource_id::text = %s
                RETURNING
                    resource_id,
                    resource_name,
                    is_deployed,
                    availability_status,
                    last_verified_at
                """,
                (
                    is_deployed,
                    normalized_status,
                    resource_id,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return dict(row) if row else None

        finally:
            cur.close()
            conn.close()
    async def _send_text(self, chat_id: str, text: str, reply_markup: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"chat_id": chat_id, "text": text}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return await self._api("sendMessage", payload)

    async def _send_location(self, chat_id: str, lat: float, lng: float, caption: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"chat_id": chat_id, "latitude": lat, "longitude": lng}
        if caption:
            payload["caption"] = caption
        return await self._api("sendLocation", payload)

    async def _pin(self, chat_id: str, message_id: int) -> None:
        try:
            await self._api("pinChatMessage", {"chat_id": chat_id, "message_id": message_id, "disable_notification": True})
        except Exception as exc:
            logger.debug("Could not pin Telegram alert in chat %s: %s", chat_id, exc)

    async def send_alert(
        self,
        chat_id: str,
        language: str,
        zone_id: str,
        zone_name: str,
        risk_level: str,
        fos: float,
        road_status: str,
        lat: float,
        lng: float,
        rendered_text: str,
        role: str = "citizen",
    ) -> Dict[str, Any]:
        buttons = {
            "inline_keyboard": [
                [
                    {
                        "text": self._t(chat_id, "evacuation_route"),
                        "url": f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
                    },
                    {
                        "text": self._t(chat_id, "im_safe"),
                        "callback_data": f"safe:{zone_id}",
                    },
                ],
                [
                    {
                        "text": self._t(chat_id, "report_ground"),
                        "callback_data": f"report:{zone_id}",
                    }
                ],
            ]
        }
        result = await self._send_text(chat_id, rendered_text, buttons)

        resource = self._nearest_available_resource(zone_id)

        if resource:
            distance_km = float(resource["distance_m"]) / 1000.0

            resource_message = (
                "🚑 NEAREST AVAILABLE RESPONSE RESOURCE\n\n"
                f"Unit: {resource['resource_name']}\n"
                f"Type: {resource['unit_type']}\n"
                f"Distance: {distance_km:.1f} km\n"
                f"Personnel: {resource['personnel_count']}\n"
                f"Officer: {resource['contact_officer']}\n"
                f"Status: {resource['availability_status'].upper()}"
            )

            await self._send_text(chat_id, resource_message)

            await self._send_location(
                chat_id,
                float(resource["lat"]),
                float(resource["lng"]),
                f"Nearest response resource: {resource['resource_name']}",
            )

        shelter = self._nearest_shelter(zone_id)

        if shelter:
            await self._send_location(
                chat_id,
                float(shelter["lat"]),
                float(shelter["lng"]),
                f"Nearest available relief camp: {shelter['resource_name']}",
            )

        if risk_level == "CRITICAL" and role == "official":
            message_id = result.get("result", {}).get("message_id")
            if message_id:
                await self._pin(chat_id, message_id)

        return result

    async def broadcast_zone_alert(
        self,
        zone_id: str,
        zone_name: str,
        risk_level: str,
        fos: float,
        road_status: str,
        lat: float,
        lng: float,
        rendered_by_language,
    ) -> Dict[str, Any]:
        if not self.enabled:
            return {"status": "DISABLED", "sent": 0}
        subscribers = self.subscribers_for_zone(zone_id)
        if not subscribers:
            return {"status": "NO_SUBSCRIBERS", "sent": 0}

        # Short Redis-based cooldown prevents repeat messages for the same zone/severity.
        r = None
        dedup_key = f"telegram:alert:{zone_id}:{risk_level}"
        try:
            if self.redis_getter:
                r = await self.redis_getter()
            if r:
                already = await r.get(dedup_key)
                if already:
                    return {"status": "DEDUPLICATED", "sent": 0}
                await r.set(dedup_key, "1", ex=600)
        except Exception as exc:
            logger.debug("Telegram dedupe unavailable: %s", exc)

        async def send_one(sub: Dict[str, Any]):
            lang = sub.get("language", "en") if sub.get("language") in VALID_LANGS else "en"
            text = rendered_by_language(lang)
            try:
                result = await self.send_alert(
                    chat_id=str(sub["chat_id"]), language=lang, zone_id=zone_id,
                    zone_name=zone_name, risk_level=risk_level, fos=fos,
                    road_status=road_status, lat=lat, lng=lng,
                    rendered_text=text, role=sub.get("role", "citizen"),
                )
                return {"chat_id": str(sub["chat_id"]), "status": "DELIVERED", "message_id": result.get("result", {}).get("message_id")}
            except Exception as exc:
                logger.warning("Telegram delivery failed for %s: %s", sub["chat_id"], exc)
                return {"chat_id": str(sub["chat_id"]), "status": "FAILED", "error": str(exc)}

        results = await asyncio.gather(*(send_one(s) for s in subscribers))
        sent = sum(1 for r in results if r["status"] == "DELIVERED")
        return {"status": "COMPLETED", "sent": sent, "failed": len(results) - sent, "results": results}

    async def handle_update(self, update: Dict[str, Any]) -> None:
        if "callback_query" in update:
            await self._handle_callback(update["callback_query"])
            return
        message = update.get("message") or {}
        chat = message.get("chat") or {}
        if not chat:
            return
        chat_id = str(chat.get("id"))
        user = message.get("from") or {}
        text = (message.get("text") or "").strip()
        location = message.get("location")

        if location:
            pending_key = f"telegram:pending_report:{chat_id}"
            r = await self.redis_getter() if self.redis_getter else None
            pending = await r.get(pending_key) if r else None

            if pending:
                report = self._record_ground_report(
                    chat_id,
                    float(location["latitude"]),
                    float(location["longitude"]),
                    user
                )

                if r:
                    await r.delete(pending_key)

                await self._send_text(
                    chat_id,
                    self._t(
                        chat_id,
                        "ground_report_received",
                        report_id=report["report_id"],
                    )
                )
                return

            zone = self._resolve_zone_from_location(
                float(location["latitude"]),
                float(location["longitude"])
            )

            if zone:
                self._store_subscription(
                    chat_id,
                    str(zone["zone_id"]),
                    "en",
                    "citizen"
                )

                await self._send_text(
                    chat_id,
                    self._t(
                        chat_id,
                        "subscribed",
                        zone_name=zone["zone_name"],
                        zone_code=zone["zone_code"],
                    )
                )
            else:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "no_zone_location")
                )

            return

        if not text:
            return
        command, *args = text.split(maxsplit=1)
        arg = args[0].strip() if args else ""
        command = command.split("@")[0].lower()

        if command == "/start":
            await self._send_text(
                chat_id,
                self._t(chat_id, "start"),
            )
            return

        if command == "/lang":
            lang = arg.lower()

            if lang not in VALID_LANGS:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "unsupported_language")
                )
                return

            role = (
                "official"
                if chat.get("type") in {"group", "supergroup"}
                else "citizen"
            )

            self._set_user_language(
                chat_id,
                lang,
                role,
            )

            conn = self._connect()
            cur = conn.cursor()

            try:
                cur.execute(
                    """
                    UPDATE telegram_subscribers
                    SET language = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE chat_id = %s
                    AND active = TRUE
                    """,
                    (lang, chat_id)
                )
                conn.commit()

            finally:
                cur.close()
                conn.close()

            await self._send_text(
                chat_id,
                self._t(
                    chat_id,
                    "language_changed",
                    lang=lang
                )
            )
            return

        if command == "/subscribe":
            zone = self._resolve_zone(arg)

            if not zone:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "zone_not_found")
                )
                return

            selected_language = self._get_user_language(chat_id)

            row = self._store_subscription(
                chat_id,
                str(zone["zone_id"]),
                selected_language,
                "official" if chat.get("type") in {"group", "supergroup"} else "citizen"
            )

            await self._send_text(
                chat_id,
                self._t(
                    chat_id,
                    "subscribed",
                    zone_name=zone["zone_name"],
                    zone_code=zone["zone_code"],
                )
            )
            return

        if command == "/unsubscribe":
            changed = self._unsubscribe(chat_id)

            await self._send_text(
                chat_id,
                self._t(
                    chat_id,
                    "unsubscribed",
                    count=changed,
                )
            )
            return

        if command == "/status":
            status = self._system_status()

            await self._send_text(
                chat_id,
                self._t(
                    chat_id,
                    "status",
                    sensors=status["sensors"],
                    critical=status["critical"],
                    high=status["high"],
                )
            )
            return

        if command == "/critical":
            zones = self._active_critical_zones()

            if not zones:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "no_critical")
                )
                return

            lines = [self._t(chat_id, "critical_title")]

            for z in zones:
                lines.append(
                    f"\n{'🔴' if z['current_risk_status'] == 'CRITICAL' else '🟠'} "
                    f"{z['zone_code']} — {z['zone_name']}\n"
                    f"{self._t(chat_id, 'fos', fos=z['current_fos'])}"
                )

            await self._send_text(chat_id, "\n".join(lines))
            return

        if command == "/update_status":
            parts = arg.split()

            if len(parts) != 2:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "update_status_usage")
                )
                return

            updated = self._update_resource_status(parts[0], parts[1])

            if updated:
                status_text = "DEPLOYED" if updated["is_deployed"] else "AVAILABLE"

                await self._send_text(
                    chat_id,
                    self._t(
                        chat_id,
                        "resource_updated",
                        resource=updated["resource_name"],
                        status=status_text,
                    )
                )
            else:
                await self._send_text(
                    chat_id,
                    self._t(chat_id, "resource_not_found")
                )

            return

        await self._send_text(
        chat_id,
        self._t(chat_id, "unknown_command")
    )

    async def _handle_callback(self, callback: Dict[str, Any]) -> None:
        callback_id = callback.get("id")
        chat_id = str((callback.get("message") or {}).get("chat", {}).get("id"))
        data = callback.get("data") or ""
        user = callback.get("from") or {}

        try:
            if data.startswith("safe:"):
                zone_id = data.split(":", 1)[1]

                self._record_safe_event(
                    chat_id,
                    zone_id,
                    user
                )

                await self._api(
                    "answerCallbackQuery",
                    {
                        "callback_query_id": callback_id,
                        "text": self._t(
                            chat_id,
                            "safe_callback"
                        ),
                    }
                )

                await self._send_text(
                    chat_id,
                    self._t(
                        chat_id,
                        "safe_response"
                    )
                )

            elif data.startswith("report:"):
                zone_id = data.split(":", 1)[1]

                r = (
                    await self.redis_getter()
                    if self.redis_getter
                    else None
                )

                if r:
                    await r.set(
                        f"telegram:pending_report:{chat_id}",
                        zone_id,
                        ex=900
                    )

                await self._api(
                    "answerCallbackQuery",
                    {
                        "callback_query_id": callback_id,
                        "text": self._t(
                            chat_id,
                            "location_callback"
                        ),
                    }
                )

                await self._send_text(
                    chat_id,
                    self._t(
                        chat_id,
                        "ground_report_prompt"
                    )
                )

            else:
                await self._api(
                    "answerCallbackQuery",
                    {
                        "callback_query_id": callback_id,
                        "text": self._t(
                            chat_id,
                            "action_received"
                        ),
                    }
                )

        except Exception as exc:
            logger.warning(
                "Telegram callback handling failed: %s",
                exc
            )


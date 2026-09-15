import os
import time
import requests

TOKEN = "8641775796:AAHq0xrHboZwHpdUnQ2BgQsjhgq1hmX_P7Y"
WEBHOOK_URL = "http://localhost:8000/api/v1/telegram/webhook"
API_URL = f"https://api.telegram.org/bot{TOKEN}"

print("Deleting webhook (if any) to enable polling...", flush=True)
try:
    r = requests.post(f"{API_URL}/deleteWebhook", timeout=10)
    print("Delete webhook response:", r.json(), flush=True)
except Exception as e:
    print("Failed to delete webhook:", e, flush=True)

print(f"Starting long-polling relay to {WEBHOOK_URL}...", flush=True)
offset = 0

while True:
    try:
        res = requests.get(f"{API_URL}/getUpdates", params={"timeout": 60, "offset": offset}, timeout=70)
        if res.status_code == 200:
            updates = res.json().get("result", [])
            for update in updates:
                offset = update["update_id"] + 1
                try:
                    headers = {"X-Telegram-Bot-Api-Secret-Token": ""}
                    print(f"Forwarding update {update['update_id']} to {WEBHOOK_URL}...", flush=True)
                    forward_res = requests.post(WEBHOOK_URL, json=update, headers=headers, timeout=10)
                    print(f"Forward response HTTP {forward_res.status_code}: {forward_res.text}", flush=True)
                except Exception as e:
                    print(f"Error forwarding update {update['update_id']}: {e}", flush=True)
        else:
            print(f"Telegram API Error: {res.status_code} - {res.text}", flush=True)
            time.sleep(2)
    except requests.exceptions.Timeout:
        # Expected on long-poll timeout, just continue
        continue
    except Exception as e:
        print(f"Polling error: {e}", flush=True)
        time.sleep(5)

import requests
import json
import uuid
import datetime

SUPABASE_URL = 'https://ftoswgnwivydxmdxphgf.supabase.co'
# Assuming the publishable key acts as the anon key for REST access
SUPABASE_KEY = 'sb_publishable_zUkFXvShYk-MKATo8zj49A_KPokqX62'

# Ensure you have your actual anon key if the above is not correct. 
# We'll try it first!
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

mock_data = [
    {
        "id": str(uuid.uuid4()),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "geo_coordinates": "13.0827, 80.2707",
        "physical_observations": "Severe flooding and soil erosion near Marina Beach road.",
        "severity_level": "CRITICAL",
        "category": "Flooding",
        "image_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=400",
        "reported_by": "Chennai User (Test)"
    }
]

url = f"{SUPABASE_URL}/rest/v1/Field_reports"

response = requests.post(url, headers=headers, json=mock_data)

if response.status_code in [200, 201]:
    print("Successfully inserted mock data!")
    print(json.dumps(response.json(), indent=2))
else:
    print(f"Failed to insert data: {response.status_code}")
    print(response.text)

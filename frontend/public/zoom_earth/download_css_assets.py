import os
import re
import requests
from urllib.parse import urljoin

BASE_URL = "https://zoom.earth/"
CLONE_DIR = r"c:\D\SIH\Landslide-Nexus-Upgraded (1)\zoom_earth_clone"
CSS_FILE = os.path.join(CLONE_DIR, "assets", "css", "app.7bbc8c67.css")
HEADERS = {'User-Agent': 'Mozilla/5.0'}

def download_assets():
    if not os.path.exists(CSS_FILE):
        print(f"CSS file not found: {CSS_FILE}")
        return

    with open(CSS_FILE, 'r', encoding='utf-8') as f:
        css_content = f.read()

    # Find all url(...) in CSS
    urls = re.findall(r'url\((.*?)\)', css_content)
    
    # Also grab the ones from the user's console log just to be safe
    extra_files = [
        "assets/images/icons/layers.12.svg",
        "assets/images/icons/overlays.14.svg",
        "assets/images/icons/close.7.svg",
        "assets/images/icons/arrow.1.svg",
        "assets/images/icons/play.2.svg",
        "assets/images/icons/recent.3.svg",
        "assets/images/icons/search.4.svg",
        "assets/images/icons/settings.7.svg",
        "assets/images/icons/about.3.svg",
        "assets/images/icons/geolocation.3.svg",
        "assets/images/icons/share.5.svg",
        "assets/images/icons/other.6.svg",
        "assets/images/icons/measure.5.svg",
        "assets/images/title.2.svg",
        "assets/images/icons/zoom.3.svg",
        "assets/images/icons/delete.2.svg",
        "assets/images/icons/pro-title.1.svg",
        "assets/images/icons/appearance.1.svg",
        "assets/images/icons/map-tooltip.1.svg",
        "assets/images/crosshair.2.svg",
        "assets/images/icons/close-small.1.svg",
        "assets/images/icons/activity.2.png",
        "assets/images/icons/warning.3.svg",
        "assets/images/icons/condition.2.svg",
        "assets/images/icons/wind-arrow-circle.1.svg",
        "assets/images/icons/wind-arrow-small.2.svg",
        "assets/images/icons/wind-arrow-large.1.svg",
        "assets/images/icons/cyclone.4.svg",
        "assets/images/icons/fire.1.png",
        "assets/images/icons/fire-complex.1.png",
        "assets/images/icons/fire-prescribed.1.png",
        "assets/images/icons/external.2.svg",
        "assets/images/icons/retry.1.svg",
        "assets/images/icons/drag.1.svg",
        "assets/images/icons/reorder.1.svg",
        "assets/images/icons/favorite.1.svg",
    ]

    download_queue = set(extra_files)

    for u in urls:
        # Clean quotes
        u = u.strip('\'" \t')
        if u.startswith('data:'):
            continue
        
        # CSS is in /assets/css/, so relative path '../images/icons/...' means /assets/images/icons/...
        if u.startswith('../'):
            absolute_path = "assets/" + u[3:]
            download_queue.add(absolute_path)
            
    for asset_path in download_queue:
        remote_url = urljoin(BASE_URL, asset_path)
        local_path = os.path.join(CLONE_DIR, asset_path.replace('/', os.sep))
        
        if not os.path.exists(local_path):
            try:
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                print(f"Downloading {remote_url}...")
                response = requests.get(remote_url, headers=HEADERS, timeout=10)
                if response.status_code == 200:
                    with open(local_path, 'wb') as f:
                        f.write(response.content)
                else:
                    print(f"  -> Failed: HTTP {response.status_code}")
            except Exception as e:
                print(f"  -> Error: {e}")

if __name__ == "__main__":
    download_assets()
    print("Done downloading missing CSS assets!")

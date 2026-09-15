import urllib.request
import os
import re

base_dir = "reference_repos/zoom_earth"
os.makedirs(f"{base_dir}/assets/css", exist_ok=True)
os.makedirs(f"{base_dir}/assets/fonts", exist_ok=True)
os.makedirs(f"{base_dir}/assets/images/icons", exist_ok=True)

# 1. Download the CSS
css_url = "https://zoom.earth/assets/css/app.7bbc8c67.css"
req = urllib.request.Request(css_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        css = response.read().decode('utf-8')
        
        # We need to replace absolute paths in CSS back to relative so they load locally
        css = css.replace('url(/assets/', 'url(../')
        
        with open(f"{base_dir}/assets/css/app.7bbc8c67.css", "w", encoding="utf-8") as f:
            f.write(css)
        print("Downloaded and patched CSS")
except Exception as e:
    print(f"Error downloading CSS: {e}")

# 2. Download the Fonts & SVGs throwing CORS
assets = [
    "assets/fonts/museo-sans-cyrl-500.woff2",
    "assets/fonts/museo-sans-cyrl-700.woff2",
    "assets/fonts/museo-sans-cyrl-900.woff2",
    "assets/fonts/museo-sans-cyrl-500.woff",
    "assets/fonts/museo-sans-cyrl-700.woff",
    "assets/fonts/museo-sans-cyrl-900.woff",
    "assets/images/icons/geolocation.3.svg"
]

for asset in assets:
    url = f"https://zoom.earth/{asset}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            with open(f"{base_dir}/{asset}", "wb") as f:
                f.write(data)
            print(f"Downloaded {asset}")
    except Exception as e:
        print(f"Failed to download {asset}: {e}")

# 3. Patch index.html to use the local CSS and Fonts
html_path = f"{base_dir}/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Change the CSS links back to relative local paths
html = html.replace('href="https://zoom.earth/assets/css/', 'href="assets/css/')
html = html.replace('href="https://zoom.earth/assets/fonts/', 'href="assets/fonts/')
html = html.replace('src="https://zoom.earth/assets/images/icons/', 'src="assets/images/icons/')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Patched index.html")

import urllib.request
import os
import re

base_dir = "reference_repos/zoom_earth"

# 1. We already have the CSS locally, let's read it
css_path = f"{base_dir}/assets/css/app.7bbc8c67.css"
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# The CSS currently has `url(../fonts/...` and `url(../images/...`
# Let's extract all paths inside url(...)
urls = re.findall(r'url\((.*?)\)', css)

# Clean up quotes if any (e.g., url("../images...") -> ../images...)
urls = [u.strip("'\"") for u in urls]

for local_path in urls:
    if local_path.startswith("data:"):
        continue # Skip base64 encoded inline images
        
    # The local_path is something like '../images/icons/layers.12.svg'
    # We need to map it to the remote URL and the local save path
    
    # Remove the leading '../' to get 'images/icons/layers.12.svg'
    asset_path = local_path.replace('../', '')
    
    remote_url = f"https://zoom.earth/assets/{asset_path}"
    save_path = f"{base_dir}/assets/{asset_path}"
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    # Only download if we haven't already
    if not os.path.exists(save_path):
        req = urllib.request.Request(remote_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                data = response.read()
                with open(save_path, "wb") as f:
                    f.write(data)
                print(f"Downloaded {asset_path}")
        except Exception as e:
            print(f"Failed to download {remote_url}: {e}")

print("All CSS assets downloaded successfully!")

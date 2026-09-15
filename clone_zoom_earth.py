import urllib.request
import os

os.makedirs("reference_repos/zoom_earth", exist_ok=True)
url = "https://zoom.earth/"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
        # Save main HTML
        with open("reference_repos/zoom_earth/index.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("Successfully cloned Zoom Earth HTML to reference_repos/zoom_earth/index.html")
except Exception as e:
    print(f"Error downloading {url}: {e}")

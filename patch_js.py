import urllib.request
import os
import re

base_dir = "reference_repos/zoom_earth"
js_url = "https://zoom.earth/assets/js/app.4a9b6066.js"
save_path = f"{base_dir}/assets/js/app.4a9b6066.js"

os.makedirs(os.path.dirname(save_path), exist_ok=True)

print("Downloading Javascript bundle...")
req = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        js_content = response.read().decode('utf-8')
        
        # We need to find the anti-phishing redirect. Usually it looks like:
        # if(window.location.hostname!=="zoom.earth") window.location.replace("https://zoom.earth")
        # Or checking top.location !== self.location
        
        # Patch out location redirects
        # We will aggressively replace common redirect patterns
        js_patched = re.sub(r'window\.location\.replace\(.*?\)', 'console.log("Redirect blocked")', js_content)
        js_patched = re.sub(r'window\.location\.href\s*=\s*.*?([,;}])', r'console.log("Href redirect blocked")\1', js_patched)
        js_patched = re.sub(r'location\.replace\(.*?\)', 'console.log("Redirect blocked")', js_patched)
        
        # Also there might be a hostname check
        js_patched = js_patched.replace('"zoom.earth"', '"127.0.0.1"')
        js_patched = js_patched.replace("'zoom.earth'", "'127.0.0.1'")
        
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(js_patched)
        print("Patched and saved JS bundle.")
        
except Exception as e:
    print(f"Error: {e}")

# Re-inject the script into index.html
html_path = f"{base_dir}/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

if 'app.4a9b6066.js' not in html:
    html = html.replace('</body>', '\t<script src="assets/js/app.4a9b6066.js"></script>\n\t</body>')
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("Re-injected local script into HTML.")

import os
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

BASE_URL = "https://zoom.earth/"
OUTPUT_DIR = r"c:\D\SIH\Landslide-Nexus-Upgraded (1)\zoom_earth_clone"

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def setup():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def download_file(url, local_path):
    try:
        response = requests.get(url, stream=True, timeout=15, headers=HEADERS)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"[OK] {url}")
    except Exception as e:
        print(f"[ERROR] Failed to download {url}: {e}")

def scrape():
    setup()
    print(f"Fetching main page: {BASE_URL}")
    response = requests.get(BASE_URL, headers=HEADERS)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    tags = {
        'link': 'href',
        'script': 'src',
        'img': 'src',
        'source': 'src'
    }
    
    for tag_name, attr in tags.items():
        for tag in soup.find_all(tag_name):
            url = tag.get(attr)
            if not url:
                continue
            
            # Skip absolute urls that are not from zoom.earth
            if url.startswith('http') and 'zoom.earth' not in url:
                continue
            
            # Resolve relative URLs
            absolute_url = urljoin(BASE_URL, url)
            
            # Create local file path
            parsed_url = urlparse(absolute_url)
            local_rel_path = parsed_url.path.lstrip('/')
            if not local_rel_path:
                continue
                
            local_path = os.path.join(OUTPUT_DIR, local_rel_path.replace('/', os.sep))
            
            # Update HTML to point to local relative path
            tag[attr] = local_rel_path
            
            # Download file
            if not os.path.exists(local_path):
                download_file(absolute_url, local_path)

    # Save modified HTML
    index_path = os.path.join(OUTPUT_DIR, 'index.html')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"\nDone! Local clone saved to {index_path}")

if __name__ == "__main__":
    scrape()

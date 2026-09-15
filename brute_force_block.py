import re

html_path = "reference_repos/zoom_earth/index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Add anti-redirect script at the top of head
anti_redirect = """<script>
  // Block programmatic redirects
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  
  window.location.assign = function(url) {
      console.log("Blocked assign to: " + url);
  };
  window.location.replace = function(url) {
      console.log("Blocked replace to: " + url);
  };
  
  // Block any page unloads
  window.addEventListener('beforeunload', function (e) {
      e.preventDefault();
      e.returnValue = 'Blocked redirect';
      return 'Blocked redirect';
  });
</script>"""

if 'Blocked programmatic redirects' not in html:
    html = html.replace('<head>', '<head>\n\t' + anti_redirect)

# Re-add JS if missing
if 'app.4a9b6066.js' not in html:
    html = html.replace('</body>', '\t<script src="assets/js/app.4a9b6066.js"></script>\n\t</body>')

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
    
print("Injected brute-force redirect blockers.")

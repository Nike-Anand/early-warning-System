import re

filepath = r"reference_repos\zoom_earth\index.html"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the base tag
content = content.replace('<base href="https://zoom.earth/">\n', '')

# Replace relative paths with absolute paths
content = re.sub(r'href="/', 'href="https://zoom.earth/', content)
content = re.sub(r'src="/', 'src="https://zoom.earth/', content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed relative paths without using <base> tag!")

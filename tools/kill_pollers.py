import psutil

killed = []
for p in psutil.process_iter(["pid", "cmdline"]):
    cl = p.info["cmdline"]
    if not cl:
        continue
    # Only kill actual poller script invocations, never this helper.
    if any(a.replace("\\", "/").endswith("telegram_poller.py") for a in cl):
        try:
            p.terminate()
            killed.append(p.pid)
        except Exception as exc:  # noqa: BLE001
            print("could not kill", p.pid, exc)

print("killed:", killed)

# Verify: list any surviving poller processes.
remaining = []
for p in psutil.process_iter(["pid", "cmdline"]):
    cl = p.info["cmdline"]
    if cl and any(a.replace("\\", "/").endswith("telegram_poller.py") for a in cl):
        remaining.append(p.pid)
print("surviving pollers:", remaining)
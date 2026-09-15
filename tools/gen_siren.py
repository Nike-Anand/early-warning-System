"""Generate an emergency siren WAV (two-tone wail) for the Flutter app."""
import math, os, struct, wave

SR = 22050
DUR = 5.0
N = int(SR * DUR)

F_LO = 620.0
F_HI = 1240.0
# Siren "wail" = frequency oscillates between F_LO and F_HI ~2.5 times over the clip.
CYCLE = 2.0  # full wail cycles per clip
freq = lambda t: F_LO + (F_HI - F_LO) * (0.5 + 0.5 * math.sin(2 * math.pi * CYCLE * t / DUR))

samples = []
for i in range(N):
    t = i / SR
    # gentle fade in/out to avoid clicks
    fade = min(1.0, t / 0.15, (DUR - t) / 0.15)
    val = 0.6 * fade * math.sin(2 * math.pi * freq(t) * t)
    samples.append(int(max(-1.0, min(1.0, val)) * 32767))

def write_wav(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", s) for s in samples))
    print("wrote", path, os.path.getsize(path), "bytes")

write_wav("mobile/assets/sounds/siren_alert.wav")
write_wav("mobile/android/app/src/main/res/raw/siren_alert.wav")
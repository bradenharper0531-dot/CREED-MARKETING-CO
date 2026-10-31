"""Renders tools/hero-loop.html to public/creed-intro.mp4 (the mark being poured, plays once),
public/creed-loop.mp4 (the seamless turn that follows) and public/creed-loop.jpg (poster =
loop frame 0 = the intro's hand-off frame). Needs Playwright + ffmpeg."""
import base64, pathlib, subprocess, tempfile
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
public = here.parent / "public"
public.mkdir(exist_ok=True)

def encode(folder, out):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", str(folder / "f%04d.jpg"),
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-an", str(out)], check=True)

loop, intro = pathlib.Path(tempfile.mkdtemp()), pathlib.Path(tempfile.mkdtemp())
with sync_playwright() as p:
    # WebGL in a headless browser (software rendering is fine; it's offline)
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    # three.js loads from the CDN; if it's installed locally (npm i three), use that copy instead
    local = next((d / "three/build/three.module.js" for d in [here.parent / "node_modules", pathlib.Path.home() / "three/node_modules", pathlib.Path("/home/claude/three/node_modules")] if (d / "three/build/three.module.js").exists()), None)
    if local:
        pg.route("**/three.module.js", lambda r: r.fulfill(path=str(local), content_type="text/javascript"))
    pg.on("pageerror", lambda e: print("page error:", e))
    pg.goto((here / "hero-loop.html").as_uri())
    pg.wait_for_function("window.ready === true", timeout=60000)
    n, ni = pg.evaluate("window.N_FRAMES"), pg.evaluate("window.INTRO_FRAMES")
    for i in range(n):
        d = pg.evaluate(f"window.frame({i}, 'image/jpeg', 0.95)")
        (loop / f"f{i:04d}.jpg").write_bytes(base64.b64decode(d.split(",", 1)[1]))
    for i in range(ni):
        d = pg.evaluate(f"window.introFrame({i}, 'image/jpeg', 0.95)")
        (intro / f"f{i:04d}.jpg").write_bytes(base64.b64decode(d.split(",", 1)[1]))
    b.close()
encode(loop, public / "creed-loop.mp4")
encode(intro, public / "creed-intro.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(loop / "f0000.jpg"), "-q:v", "3", str(public / "creed-loop.jpg")], check=True)
print("loop frames:", n, "intro frames:", ni)

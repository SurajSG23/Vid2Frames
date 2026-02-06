# pip install fastapi uvicorn python-multipart opencv-python pillow

# uvicorn app:app --reload

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import uuid
import cv2
import os

# -----------------------
# App Setup
# -----------------------
app = FastAPI(title="Video Frame Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
VIDEO_DIR = BASE_DIR / "static/videos"
FRAME_DIR = BASE_DIR / "static/frames"

VIDEO_DIR.mkdir(parents=True, exist_ok=True)
FRAME_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# -----------------------
# Utility: Frame Extractor
# -----------------------
def extract_frames(video_path: str, output_dir: str, fps: int):
    cap = cv2.VideoCapture(video_path)

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps == 0:
        raise Exception("Invalid video file")

    interval = int(video_fps // fps)
    interval = max(1, interval)

    frame_count = 0
    saved_count = 0

    os.makedirs(output_dir, exist_ok=True)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % interval == 0:
            frame_path = os.path.join(output_dir, f"frame_{saved_count}.jpg")
            cv2.imwrite(frame_path, frame)
            saved_count += 1

        frame_count += 1

    cap.release()

# -----------------------
# API: Upload & Process
# -----------------------
@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    fps: int = Form(1)
):
    video_id = str(uuid.uuid4())

    video_path = VIDEO_DIR / f"{video_id}.mp4"
    frame_output_dir = FRAME_DIR / video_id

    # Save video
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract frames (backend processing)
    extract_frames(
        video_path=str(video_path),
        output_dir=str(frame_output_dir),
        fps=fps
    )

    # Build frame URLs
    frame_files = sorted(os.listdir(frame_output_dir))
    frame_urls = [
        f"/static/frames/{video_id}/{frame}"
        for frame in frame_files
    ]

    return {
        "video_id": video_id,
        "total_frames": len(frame_urls),
        "frames": frame_urls
    }

# -----------------------
# Health Check
# -----------------------
@app.get("/health")
def health():
    return {"status": "ok"}

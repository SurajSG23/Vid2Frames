import React, { useState, useRef, useEffect } from "react";
import "./App.scss";
import axios from "axios";

// Types
interface ExtractedFrame {
  id: number;
  url: string;
  timestamp: string;
}

type ProcessingStage =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number;
  message: string;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: "idle",
    progress: 0,
    message: "",
  });
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrame | null>(
    null,
  );
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* File Handling */

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file");
      return;
    }
    setSelectedFile(file);
    setExtractedFrames([]);
    setProcessingStatus({ stage: "idle", progress: 0, message: "" });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedFrames([]);
    setProcessingStatus({ stage: "idle", progress: 0, message: "" });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExtractFrames = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("fps", fps.toString());

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );

            setProcessingStatus({
              stage: "uploading",
              progress,
              message: "Uploading video...",
            });
          },
        },
      );

      const { frames } = response.data;

      // Map backend frames → frontend format
      setExtractedFrames(
        frames.map((url: string, index: number) => ({
          id: index + 1,
          url: `${import.meta.env.VITE_BACKEND_URL}${url}`,
          timestamp: (index / fps).toFixed(2),
        })),
      );

      setProcessingStatus({
        stage: "completed",
        progress: 100,
        message: "Frame extraction complete!",
      });
    } catch (error) {
      console.error("Upload error:", error);
      setProcessingStatus({
        stage: "error",
        progress: 0,
        message: "Failed to process video.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!selectedFrame) return;
    const onEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setSelectedFrame(null);
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [selectedFrame]);

  return (
    <div className="app">
      <div className="container">
        {/* Hero */}
        <div className="hero">
          <h1 className="hero__title">Extract Frames from Your Videos</h1>
        </div>

        {/* Upload */}
        <div
          className={`upload-section ${isDragOver ? "upload-section--drag-over" : ""} ${
            selectedFile ? "upload-section--has-file" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="upload-section__content">
            <h3>Drag & Drop Your Video</h3>
            <p>or click to browse</p>

            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Select Video File
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) =>
                e.target.files && handleFileSelect(e.target.files[0])
              }
            />

            {selectedFile && (
              <div className="upload-section__file-info">
                <span>{selectedFile.name}</span>
                <button onClick={handleRemoveFile}>Remove</button>
              </div>
            )}

          </div>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="controls-section__group controls-section__fps-selector">
            <label className="controls-section__label" htmlFor="fps-select">
              Extract at:
            </label>

            <select
              id="fps-select"
              className="controls-section__select"
              value={fps}
              onChange={(e) => setFps(+e.target.value)}
            >
              <option value={1}>1 FPS</option>
              <option value={5}>5 FPS</option>
              <option value={10}>10 FPS</option>
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
            </select>

            <p className="controls-section__fps-info">
              {fps} frame{fps > 1 ? "s" : ""} per second
            </p>
          </div>

          <button
            className="controls-section__extract-button"
            disabled={!selectedFile || isProcessing}
            onClick={handleExtractFrames}
          >
            {isProcessing ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                Processing…
              </>
            ) : (
              "Extract Frames"
            )}
          </button>
        </div>

        {/* Progress */}
        {processingStatus.stage !== "idle" && (
          <div className="progress-section">
            <div
              className="progress-section__bar"
              style={{ width: `${processingStatus.progress}%` }}
            />
            <p>{processingStatus.message}</p>
          </div>
        )}

        {/* Gallery */}
        {extractedFrames.length > 0 && (
          <div className="gallery-section">
            <div className="gallery-section__header">
              <h2 className="gallery-section__title">Extracted Frames</h2>
              <span className="gallery-section__count">
                {extractedFrames.length} frames
              </span>
            </div>

            <div className="gallery-section__grid">
              {extractedFrames.map((frame) => (
                <div
                  key={frame.id}
                  className="gallery-section__card"
                  onClick={() => setSelectedFrame(frame)}
                >
                  <img
                    src={frame.url}
                    alt={`Frame ${frame.id}`}
                    className="gallery-section__image"
                  />

                  <div className="gallery-section__info">
                    <div className="gallery-section__frame-number">
                      Frame {frame.id}
                    </div>
                    <div className="gallery-section__timestamp">
                      {frame.timestamp}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedFrame && (
        <div className="image-modal" onClick={() => setSelectedFrame(null)}>
          <img src={selectedFrame.url} alt="" />
        </div>
      )}
    </div>
  );
};

export default App;

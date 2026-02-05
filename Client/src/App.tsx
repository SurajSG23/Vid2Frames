import React, { useState, useRef } from 'react';
import './App.scss';

// Types
interface ExtractedFrame {
  id: number;
  url: string;
  timestamp: string;
}

type ProcessingStage = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number;
  message: string;
}

// Header Component
const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header__logo">
        <span className="header__logo-icon">📹</span>
        <span className="header__logo-text">FrameExtract</span>
      </div>
      <nav className="header__nav">
        <a href="#home" className="header__nav-link">Home</a>
        <a href="#docs" className="header__nav-link">Docs</a>
        <a href="#about" className="header__nav-link">About</a>
      </nav>
    </header>
  );
};

// Hero Component
const Hero: React.FC = () => {
  return (
    <div className="hero">
      <h1 className="hero__title">Extract Frames from Your Videos</h1>
      <p className="hero__subtitle">
        Upload a video and let our backend extract individual frames at your desired frame rate. 
        Simple, fast, and professional.
      </p>
    </div>
  );
};

// Upload Section Component
interface UploadSectionProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  selectedFile,
  onFileSelect,
  onRemoveFile
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }
    onFileSelect(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`upload-section ${isDragOver ? 'upload-section--drag-over' : ''} ${selectedFile ? 'upload-section--has-file' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-section__content">
        <div className="upload-section__icon">⬆️</div>
        <h3 className="upload-section__title">Drag & Drop Your Video</h3>
        <p className="upload-section__text">or click to browse</p>
        <button
          className="upload-section__button"
          onClick={handleBrowseClick}
          type="button"
        >
          Select Video File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/avi,video/webm"
          onChange={handleFileInputChange}
          className="upload-section__input"
        />
        <div className="upload-section__formats">
          Supported formats: MP4, MOV, AVI, WebM
        </div>
        {selectedFile && (
          <div className="upload-section__file-info">
            <span className="upload-section__file-name">{selectedFile.name}</span>
            <button
              className="upload-section__remove"
              onClick={onRemoveFile}
              type="button"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Controls Section Component
interface ControlsSectionProps {
  fps: number;
  onFpsChange: (fps: number) => void;
  onExtractFrames: () => void;
  isDisabled: boolean;
}

const ControlsSection: React.FC<ControlsSectionProps> = ({
  fps,
  onFpsChange,
  onExtractFrames,
  isDisabled
}) => {
  const handleFpsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFpsChange(parseInt(e.target.value));
  };

  return (
    <div className="controls-section">
      <div className="controls-section__group">
        <label htmlFor="fps-selector" className="controls-section__label">
          Frames Per Second (FPS)
        </label>
        <div className="controls-section__fps-selector">
          <select
            id="fps-selector"
            value={fps}
            onChange={handleFpsChange}
            className="controls-section__select"
          >
            <option value={1}>1 FPS (Every second)</option>
            <option value={2}>2 FPS</option>
            <option value={5}>5 FPS</option>
            <option value={10}>10 FPS</option>
            <option value={15}>15 FPS</option>
            <option value={24}>24 FPS (Film standard)</option>
            <option value={30}>30 FPS (Video standard)</option>
          </select>
          <span className="controls-section__fps-info">
            Higher FPS = More frames extracted
          </span>
        </div>
      </div>
      <button
        className="controls-section__extract-button"
        onClick={onExtractFrames}
        disabled={isDisabled}
        type="button"
      >
        Extract Frames
      </button>
    </div>
  );
};

// Progress Section Component
interface ProgressSectionProps {
  status: ProcessingStatus;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ status }) => {
  const getStatusText = () => {
    switch (status.stage) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  };

  return (
    <div className="progress-section">
      <div className="progress-section__header">
        <span className="progress-section__status">{getStatusText()}</span>
        <span className="progress-section__percentage">{status.progress}%</span>
      </div>
      <div className="progress-section__bar-container">
        <div
          className="progress-section__bar"
          style={{ width: `${status.progress}%` }}
        />
      </div>
      <div className="progress-section__message">{status.message}</div>
    </div>
  );
};

// Gallery Section Component
interface GallerySectionProps {
  frames: ExtractedFrame[];
  onFrameClick: (frame: ExtractedFrame) => void;
}

const GallerySection: React.FC<GallerySectionProps> = ({ frames, onFrameClick }) => {
  return (
    <div className="gallery-section">
      <div className="gallery-section__header">
        <h2 className="gallery-section__title">Extracted Frames</h2>
        <span className="gallery-section__count">
          {frames.length} frame{frames.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="gallery-section__grid">
        {frames.map((frame) => (
          <div
            key={frame.id}
            className="gallery-section__card"
            onClick={() => onFrameClick(frame)}
          >
            <img
              src={frame.url}
              alt={`Frame ${frame.id}`}
              className="gallery-section__image"
            />
            <div className="gallery-section__info">
              <div className="gallery-section__frame-number">Frame {frame.id}</div>
              <div className="gallery-section__timestamp">{frame.timestamp}s</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p className="footer__text">
        FrameExtract © 2024 | All processing happens securely on our servers
      </p>
    </footer>
  );
};

// Image Modal Component
interface ImageModalProps {
  frame: ExtractedFrame | null;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ frame, onClose }) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (frame) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [frame, onClose]);

  if (!frame) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-modal" onClick={handleBackdropClick}>
      <div className="image-modal__content">
        <button
          className="image-modal__close"
          onClick={onClose}
          type="button"
          aria-label="Close modal"
        >
          ×
        </button>
        <img
          src={frame.url}
          alt={`Frame ${frame.id}`}
          className="image-modal__image"
        />
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrame | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedFrames([]);
    setProcessingStatus({ stage: 'idle', progress: 0, message: '' });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedFrames([]);
    setProcessingStatus({ stage: 'idle', progress: 0, message: '' });
  };

  const simulateUpload = (): Promise<void> => {
    return new Promise((resolve) => {
      setProcessingStatus({
        stage: 'uploading',
        progress: 0,
        message: 'Uploading video to server...'
      });

      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setProcessingStatus(prev => ({
          ...prev,
          progress,
          message: 'Uploading video to server...'
        }));

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };

  const simulateProcessing = (selectedFps: number): Promise<void> => {
    return new Promise((resolve) => {
      setProcessingStatus({
        stage: 'processing',
        progress: 0,
        message: `Extracting frames at ${selectedFps} FPS. Backend is processing your video...`
      });

      let progress = 0;
      const interval = setInterval(() => {
        progress += 3;
        setProcessingStatus(prev => ({
          ...prev,
          progress,
          message: `Extracting frames at ${selectedFps} FPS. Backend is processing your video...`
        }));

        if (progress >= 100) {
          clearInterval(interval);
          setProcessingStatus({
            stage: 'completed',
            progress: 100,
            message: 'Frame extraction complete!'
          });

          // Generate mock frames
          const frameCount = Math.floor(Math.random() * 20) + 10;
          const frames: ExtractedFrame[] = [];
          for (let i = 0; i < frameCount; i++) {
            frames.push({
              id: i + 1,
              url: `https://picsum.photos/400/225?random=${i}`,
              timestamp: (i / selectedFps).toFixed(2)
            });
          }
          setExtractedFrames(frames);

          setTimeout(resolve, 500);
        }
      }, 100);
    });
  };

  const handleExtractFrames = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      await simulateUpload();
      await simulateProcessing(fps);
    } catch (error) {
      console.error('Error:', error);
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: 'Failed to process video. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFrameClick = (frame: ExtractedFrame) => {
    setSelectedFrame(frame);
  };

  const handleCloseModal = () => {
    setSelectedFrame(null);
  };

  return (
    <div className="app">
      <Header />
      
      <div className="container">
        <Hero />
        
        <UploadSection
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
        />
        
        <ControlsSection
          fps={fps}
          onFpsChange={setFps}
          onExtractFrames={handleExtractFrames}
          isDisabled={!selectedFile || isProcessing}
        />
        
        {processingStatus.stage !== 'idle' && (
          <ProgressSection status={processingStatus} />
        )}
        
        {extractedFrames.length > 0 && (
          <GallerySection
            frames={extractedFrames}
            onFrameClick={handleFrameClick}
          />
        )}
      </div>
      
      <Footer />
      
      <ImageModal
        frame={selectedFrame}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default App;
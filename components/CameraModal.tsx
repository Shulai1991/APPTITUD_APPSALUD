import React, { useRef, useEffect, useState } from 'react';
import Modal from './Modal';
import { CameraIcon } from './icons';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("No se pudo acceder a la cámara. Por favor, verifique los permisos en su navegador.");
      }
    };
    
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }

    if (isOpen) {
      setError(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        const maxDim = 300;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        onCapture(dataUrl);
        onClose();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tomar Foto del Paciente">
        <div className="space-y-4">
            {error ? (
                <div className="p-4 bg-red-100 text-red-700 rounded-md">
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    <div className="bg-slate-900 rounded-md overflow-hidden aspect-video">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    </div>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <button
                        onClick={handleCapture}
                        className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        <CameraIcon />
                        <span>Capturar Foto</span>
                    </button>
                </>
            )}
        </div>
    </Modal>
  );
};

export default CameraModal;
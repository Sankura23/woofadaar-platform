'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Flashlight, FlashlightOff, RotateCcw, AlertTriangle } from 'lucide-react';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  onError: (error: string) => void;
}

interface QRScanResult {
  dogId: string;
  dogName?: string;
  emergencyData?: any;
}

export default function QRCodeScanner({ isOpen, onClose, onScan, onError }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('environment');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize QR code scanner
  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  // Get available cameras
  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.enumerateDevices()
        .then((deviceList) => {
          const cameras = deviceList.filter(device => device.kind === 'videoinput');
          setDevices(cameras);
        })
        .catch((error) => {
          console.error('Error enumerating devices:', error);
        });
    }
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      // Request camera permissions
      const permission = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: currentCamera === 'environment' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setHasPermission(true);
      startScanning();
    } catch (error) {
      console.error('Camera permission denied:', error);
      setHasPermission(false);
      onError('Camera permission required for QR scanning');
    }
  };

  const startScanning = async () => {
    try {
      const constraints = {
        video: {
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);

      // Start scanning loop
      scanIntervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current && !isProcessing) {
          scanFrame();
        }
      }, 500); // Scan every 500ms

    } catch (error) {
      console.error('Error starting camera:', error);
      onError('Failed to start camera');
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== 4) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data for QR detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Here you would use a QR detection library like jsQR
      // For now, we'll simulate QR detection
      await simulateQRDetection(imageData);
      
    } catch (error) {
      console.error('QR scanning error:', error);
    }
  };

  // Simulate QR code detection (replace with actual QR library)
  const simulateQRDetection = async (imageData: ImageData) => {
    // This is a placeholder - in a real implementation, use jsQR or similar
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    // For demo purposes, we'll simulate finding a QR code occasionally
    if (Math.random() > 0.95 && !isProcessing) { // 5% chance per scan
      const simulatedDogId = `DOG${Math.random().toString(36).substr(2, 9)}`;
      handleQRDetected(simulatedDogId);
    }
  };

  const handleQRDetected = async (qrData: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Parse QR code data
      let dogId = qrData;
      let emergencyData = null;

      // Check if it's a Woofadaar QR code with JSON data
      if (qrData.startsWith('{') && qrData.endsWith('}')) {
        try {
          const parsed = JSON.parse(qrData);
          dogId = parsed.dogId || parsed.health_id;
          emergencyData = parsed.emergency || null;
        } catch (e) {
          // Not JSON, treat as plain dog ID
        }
      }

      // Validate dog ID format
      if (!dogId || dogId.length < 5) {
        onError('Invalid Dog ID in QR code');
        setIsProcessing(false);
        return;
      }

      // Set scan result and trigger callback
      const result: QRScanResult = {
        dogId,
        emergencyData
      };

      setScanResult(result);
      onScan(dogId);
      
      // Provide haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }

      // Flash the screen to indicate successful scan
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(59, 188, 168, 0.3);
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(overlay);
      setTimeout(() => document.body.removeChild(overlay), 200);

    } catch (error) {
      console.error('QR processing error:', error);
      onError('Error processing QR code');
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        });
        setFlashEnabled(!flashEnabled);
      } catch (error) {
        console.error('Flash toggle error:', error);
      }
    }
  };

  const switchCamera = async () => {
    const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
    setCurrentCamera(newCamera);
    
    if (isScanning) {
      stopScanning();
      setTimeout(() => startScanning(), 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black bg-opacity-80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Camera size={24} />
          <div>
            <h2 className="text-lg font-semibold">Scan Dog ID QR Code</h2>
            <p className="text-sm opacity-80">Point camera at the QR code</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
              <Camera size={48} className="mx-auto mb-4 opacity-60" />
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center p-6">
              <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
              <p className="text-gray-300 mb-4">
                Please allow camera access to scan Dog ID QR codes
              </p>
              <button
                onClick={initializeScanner}
                className="bg-[#3bbca8] text-white px-6 py-2 rounded-lg hover:bg-[#339990] transition-colors"
              >
                Grant Access
              </button>
            </div>
          </div>
        )}

        {hasPermission && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-64 h-64 border-2 border-[#3bbca8] rounded-2xl">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#3bbca8] animate-pulse"></div>
                  )}
                </div>
              </div>
              
              {/* Status text */}
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <p className="text-white text-lg font-medium bg-black bg-opacity-60 mx-4 py-2 rounded-lg">
                  {isProcessing ? 'Processing...' : 'Align QR code within the frame'}
                </p>
              </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Controls */}
      {hasPermission && (
        <div className="bg-black bg-opacity-80 p-4">
          <div className="flex justify-center space-x-6">
            {/* Flash toggle */}
            <button
              onClick={toggleFlash}
              className={`p-3 rounded-full transition-colors ${
                flashEnabled 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
              disabled={isProcessing}
            >
              {flashEnabled ? <Flashlight size={24} /> : <FlashlightOff size={24} />}
            </button>

            {/* Camera switch */}
            {devices.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                disabled={isProcessing}
              >
                <RotateCcw size={24} />
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            <p className="text-gray-300 text-sm">
              Hold your phone steady and ensure good lighting for best results
            </p>
          </div>
        </div>
      )}

      {/* Scan result popup */}
      {scanResult && (
        <div className="absolute inset-x-4 top-1/2 transform -translate-y-1/2 bg-white rounded-lg p-6 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">QR Code Detected!</h3>
            <p className="text-gray-600 mb-4">Dog ID: {scanResult.dogId}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setScanResult(null);
                  setIsProcessing(false);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Scan Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-[#3bbca8] text-white rounded-lg hover:bg-[#339990] transition-colors"
              >
                Verify Dog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
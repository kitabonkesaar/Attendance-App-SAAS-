
import React, { useRef, useState, useEffect } from 'react';
import { Attendance, AttendanceStatus } from '../../types';
import { DB } from '../../lib/db';
import { analyzeAttendancePhoto } from '../../services/geminiService';

interface CameraCaptureProps {
  employeeId: string;
  mode: 'IN' | 'OUT';
  onCancel: () => void;
  onSuccess: (attendance: Attendance) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ employeeId, mode, onCancel, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    startCamera();
    getCurrentLocation();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Location access is required."),
        { enableHighAccuracy: true }
      );
    }
  };

  const triggerCapture = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      capturePhoto();
      setCountdown(null);
    }
  }, [countdown]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleSubmit = async () => {
    if (!capturedImage || !location) return;

    setIsProcessing(true);
    setError(null);
    try {
      const analysis = await analyzeAttendancePhoto(capturedImage);
      if (!analysis.isValid) {
        setError(`Photo Rejected: ${analysis.reason}`);
        setCapturedImage(null);
        startCamera();
        setIsProcessing(false);
        return;
      }

      const now = new Date();
      const currentTimeStr = now.toTimeString().split(' ')[0].slice(0, 8);
      const dateStr = now.toISOString().split('T')[0];
      const allAttendance = DB.getAttendance();

      if (mode === 'IN') {
        const settings = DB.getSettings();
        const shiftStartTime = settings.attendance_window_start;
        let status = AttendanceStatus.PRESENT;
        const [h, m] = currentTimeStr.split(':').map(Number);
        const [sh, sm] = shiftStartTime.split(':').map(Number);
        const diffMinutes = (h * 60 + m) - (sh * 60 + sm);
        if (diffMinutes > settings.late_threshold_minutes) {
          status = AttendanceStatus.LATE;
        }

        const newAttendance: Attendance = {
          id: Math.random().toString(36).substr(2, 9),
          employee_id: employeeId,
          date: dateStr,
          time: currentTimeStr,
          photo_url: capturedImage,
          latitude: location.lat,
          longitude: location.lng,
          device_id: 'BROWSER_DEMO',
          status,
          created_at: now.toISOString()
        };

        DB.saveAttendance([...allAttendance, newAttendance]);
        onSuccess(newAttendance);
      } else {
        const existingIdx = allAttendance.findIndex(a => a.employee_id === employeeId && a.date === dateStr);
        if (existingIdx === -1) {
          setError("No punch-in record found for today.");
          setIsProcessing(false);
          return;
        }

        const updatedAttendance = { ...allAttendance[existingIdx] };
        updatedAttendance.punch_out_time = currentTimeStr;
        updatedAttendance.punch_out_photo_url = capturedImage;
        updatedAttendance.punch_out_latitude = location.lat;
        updatedAttendance.punch_out_longitude = location.lng;

        const newAll = [...allAttendance];
        newAll[existingIdx] = updatedAttendance;
        DB.saveAttendance(newAll);
        onSuccess(updatedAttendance);
      }
    } catch (err) {
      setError("System error. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black text-white relative h-full overflow-hidden">
      {/* Dynamic Header */}
      <header className="absolute top-10 left-0 right-0 px-8 flex items-center justify-between z-40">
        <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Verifying</p>
           <h4 className="text-sm font-black">{mode === 'IN' ? 'Punch In' : 'Punch Out'}</h4>
        </div>
        <button 
          onClick={onCancel} 
          className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Main Viewport */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-[3rem] overflow-hidden bg-zinc-900 border-2 border-white/5 shadow-2xl">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover animate-in fade-in zoom-in-110 duration-500" />
          ) : (
            <div className="relative h-full w-full">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
              />
              
              {/* Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 pointer-events-none">
                <div className="border-r border-white/10"></div>
                <div className="border-r border-white/10"></div>
                <div></div>
              </div>
              <div className="absolute inset-0 grid grid-rows-3 pointer-events-none">
                <div className="border-b border-white/10"></div>
                <div className="border-b border-white/10"></div>
                <div></div>
              </div>

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
                  <span className="text-8xl font-black text-white animate-ping">{countdown}</span>
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* AI Processing Layer */}
          {isProcessing && (
            <div className="absolute inset-0 bg-emerald-900/90 flex flex-col items-center justify-center text-center p-10 backdrop-blur-xl z-[60] animate-in fade-in">
              <div className="w-20 h-20 relative mb-6">
                 <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                 <div className="absolute inset-0 border-t-4 border-white rounded-full animate-spin"></div>
              </div>
              <h5 className="text-xl font-black text-white mb-2 tracking-tight">AI Identity Shield</h5>
              <p className="text-xs text-white/60 leading-relaxed max-w-[200px]">Checking face alignment and lighting for secure validation...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="px-8 pb-12 flex flex-col items-center gap-8 relative z-40">
        {error && (
          <div className="bg-rose-500/20 backdrop-blur-md text-rose-200 px-5 py-3 rounded-2xl text-xs font-bold border border-rose-500/30 w-full max-w-sm text-center animate-in slide-in-from-bottom-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
           <div className={`w-2 h-2 rounded-full ${location ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 animate-pulse'}`}></div>
           <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
            {location ? 'GPS: Safe & Verified' : 'Searching Satellite...'}
           </span>
        </div>

        <div className="w-full flex items-center justify-between max-w-sm">
          {!capturedImage ? (
            <>
              <div className="w-14"></div> {/* Spacer */}
              
              <button
                disabled={!location || countdown !== null}
                onClick={triggerCapture}
                className="w-24 h-24 rounded-full border-[6px] border-white/20 p-1 group active:scale-90 transition-all disabled:opacity-20"
              >
                <div className="w-full h-full rounded-full bg-white shadow-xl flex items-center justify-center group-hover:bg-gray-100">
                   <div className="w-12 h-12 rounded-full border-2 border-zinc-200"></div>
                </div>
              </button>

              <button
                onClick={toggleCamera}
                disabled={countdown !== null}
                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all border border-white/10 disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </>
          ) : (
            <div className="flex gap-4 w-full animate-in slide-in-from-bottom-4">
              <button
                disabled={isProcessing}
                onClick={() => setCapturedImage(null)}
                className="flex-1 bg-white/10 backdrop-blur-md py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex-[2] bg-emerald-600 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-widest shadow-2xl shadow-emerald-900/40 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Submit {mode}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default CameraCapture;

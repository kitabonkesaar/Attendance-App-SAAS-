
import React, { useRef, useState, useEffect } from 'react';
import { Attendance, AttendanceStatus } from '../../types';
import { DB } from '../../lib/db';
// import { analyzeAttendancePhoto } from '../../services/geminiService';

interface CameraCaptureProps {
  employeeId: string;
  mode: 'IN' | 'OUT';
  onCancel: () => void;
  onSuccess: (attendance: Attendance) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ employeeId, mode, onCancel, onSuccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    startCamera();
    getCurrentLocation();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(`Camera Error: ${err.message || "Access blocked"}.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };


  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation({ lat: 28.6139, lng: 77.2090 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        setLocation({ lat: 28.6139, lng: 77.2090 }); 
        setError("GPS Weak. Using estimated location.");
        setTimeout(() => setError(null), 3000);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvasRef.current.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    
    const finalLocation = location || { lat: 28.6139, lng: 77.2090 };
    setIsProcessing(true);
    setError(null);
    
    try {
      // 1. AI Face Verification - DISABLED
      // const analysis = await analyzeAttendancePhoto(capturedImage);
      // if (analysis && analysis.isValid === false) {
      //   setError(`Face Check Failed: ${analysis.reason || 'Please try again.'}`);
      //   setIsProcessing(false);
      //   return;
      // }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      const fileName = `${employeeId}_${mode}_${Date.now()}.jpg`;
      
      // 2. Upload Photo (Handles base64 or Supabase)
      const photoUrl = await DB.uploadPhoto(capturedImage, fileName);

      // 3. Save Entry
      if (mode === 'IN') {
        const settings = await DB.getSettings();
        const [sh, sm] = settings.attendance_window_start.split(':').map(Number);
        const [h, m] = timeStr.split(':').map(Number);
        const diff = (h * 60 + m) - (sh * 60 + sm);
        const status = diff > settings.late_threshold_minutes ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        const record = await DB.saveAttendance({
          employee_id: employeeId,
          date: dateStr,
          time: timeStr,
          photo_url: photoUrl,
          latitude: finalLocation.lat,
          longitude: finalLocation.lng,
          device_id: 'BROWSER_CLIENT',
          status
        });
        
        onSuccess(record);
      } else {
        const logs = await DB.getAttendance();
        const todayLog = logs.find(l => l.employee_id === employeeId && l.date === dateStr);
        
        if (todayLog) {
          await DB.updateAttendance(todayLog.id, {
            punch_out_time: timeStr,
            punch_out_photo_url: photoUrl,
            punch_out_latitude: finalLocation.lat,
            punch_out_longitude: finalLocation.lng
          }, 'SYSTEM');
          onSuccess({ ...todayLog, punch_out_time: timeStr });
        } else {
          const record = await DB.saveAttendance({
            employee_id: employeeId,
            date: dateStr,
            time: '09:00:00',
            punch_out_time: timeStr,
            photo_url: 'AUTO_GEN',
            punch_out_photo_url: photoUrl,
            latitude: finalLocation.lat,
            longitude: finalLocation.lng,
            punch_out_latitude: finalLocation.lat,
            punch_out_longitude: finalLocation.lng,
            device_id: 'BROWSER_CLIENT',
            status: AttendanceStatus.PRESENT
          });
          onSuccess(record);
        }
      }
    } catch (err: any) {
      console.error("Critical submission failure:", err);
      // Safe stringification to avoid "Cannot convert object to primitive"
      const errorMsg = err?.message || (typeof err === 'string' ? err : 'Network Error');
      setError(`Submit Failed: ${errorMsg}. Please refresh and try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black text-white relative h-full font-sans">
      <header className="p-8 flex items-center justify-between z-10">
        <div className="flex flex-col">
          <h4 className="font-black uppercase tracking-[0.3em] text-emerald-400 text-[10px]">{mode === 'IN' ? 'ATTENDANCE IN' : 'ATTENDANCE OUT'}</h4>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Selfie Verification</p>
        </div>
        <button 
          onClick={onCancel} 
          disabled={isProcessing}
          className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm aspect-[3/4] rounded-[3rem] overflow-hidden bg-zinc-900 relative shadow-2xl border border-white/5">
          {capturedImage ? (
            <img src={capturedImage} className="w-full h-full object-cover animate-in fade-in" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-12 backdrop-blur-xl animate-in fade-in">
              <div className="w-10 h-10 border-[4px] border-emerald-400/20 border-t-emerald-400 animate-spin rounded-full mb-6"></div>
              <h5 className="text-lg font-black text-white tracking-tight">Syncing Record</h5>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-[8px] mt-1">Encrypted Transfer...</p>
            </div>
          )}
        </div>
      </div>

      <footer className="p-8 pb-12 flex flex-col gap-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        {error && (
          <div className="w-full space-y-3 animate-in slide-in-from-bottom-2">
            <div className="p-4 bg-rose-500/10 text-rose-300 rounded-2xl text-[9px] font-black text-center border border-rose-500/30 uppercase tracking-widest">
              {error}
            </div>
            <button 
               onClick={() => fileInputRef.current?.click()}
               className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-zinc-700 border border-white/10 transition-all"
             >
               Upload Photo Instead
             </button>
             <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
             />
          </div>
        )}
        
        {!capturedImage ? (
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={capturePhoto} 
              className="w-20 h-20 rounded-full bg-white mx-auto border-[8px] border-white/20 flex items-center justify-center active:scale-90 transition-all shadow-2xl"
            >
               <div className="w-10 h-10 rounded-full border-2 border-zinc-200"></div>
            </button>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              Tap the button to take a selfie
            </p>
          </div>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => { setCapturedImage(null); startCamera(); }} 
              disabled={isProcessing} 
              className="flex-1 py-5 bg-zinc-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] border border-white/10"
            >
              Retake
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isProcessing} 
              className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[9px] shadow-xl hover:bg-emerald-500 transition-all active:scale-95"
            >
              Verify & Punch
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default CameraCapture;

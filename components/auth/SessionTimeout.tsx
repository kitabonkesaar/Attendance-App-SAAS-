import React, { useEffect, useRef, useCallback } from 'react';

interface SessionTimeoutProps {
  isActive: boolean;
  timeoutInMs?: number; // Default 15 minutes
  onTimeout: () => void;
  warningInMs?: number; // Optional warning before timeout (future enhancement)
}

const SessionTimeout: React.FC<SessionTimeoutProps> = ({ 
  isActive, 
  timeoutInMs = 15 * 60 * 1000, 
  onTimeout 
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const resetTimer = useCallback(() => {
    if (!isActive) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      console.log("Session timed out due to inactivity.");
      onTimeout();
    }, timeoutInMs);
  }, [isActive, timeoutInMs, onTimeout]);

  useEffect(() => {
    if (!isActive) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Initial start
    resetTimer();

    // Events to listen for
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Throttle the reset to avoid performance hit on every mouse move
    let throttleTimer: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (!throttleTimer) {
        resetTimer();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000); // Only reset max once per second
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isActive, resetTimer]);

  return null; // This component doesn't render anything visible
};

export default SessionTimeout;

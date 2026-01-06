import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for countdown timer
 * @param {Date} expiresAt - Expiration timestamp
 * @param {Function} onExpire - Callback when timer expires
 */
export const useCountdown = (expiresAt, onExpire) => {
  const [timeLeft, setTimeLeft] = useState(null);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return null;
    
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return { expired: true, minutes: 0, seconds: 0, total: 0 };
    }

    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return {
      expired: false,
      minutes,
      seconds,
      total: difference,
    };
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    // Calculate immediately
    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    if (initial?.expired) {
      onExpire?.();
      return;
    }

    // Update every second
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);

      if (updated?.expired) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, calculateTimeLeft, onExpire]);

  return timeLeft;
};

/**
 * Format time for display
 */
export const formatTime = (timeLeft) => {
  if (!timeLeft || timeLeft.expired) {
    return '00:00';
  }
  const mins = String(timeLeft.minutes).padStart(2, '0');
  const secs = String(timeLeft.seconds).padStart(2, '0');
  return `${mins}:${secs}`;
};

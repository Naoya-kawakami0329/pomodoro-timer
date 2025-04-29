'use client';
import { useEffect, useRef } from 'react';

export default function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="fixed top-4 right-4 w-[180px] h-[135px]">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
    </div>
  );
}

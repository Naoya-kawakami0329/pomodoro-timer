// src/components/CameraPreview.tsx
'use client';
import React from 'react';
import usePosture from '@/hooks/usePosture';

export default function CameraPreview({ onBadPosture }: { onBadPosture: () => void }) {
  const { videoRef } = usePosture(onBadPosture);

  return (
    <div className="fixed top-4 right-4 w-[180px] h-[135px] z-50">
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-md shadow"
        width={180}
        height={135}
        muted
        playsInline
      />
    </div>
  );
}

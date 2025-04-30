// src/hooks/usePosture.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const BAD_THRESHOLD_MS = 20_000;
const COOLDOWN_MS = 90_000;

export default function usePosture(onBadPosture: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const [badStartTime, setBadStartTime] = useState<number | null>(null);

  // モデル読み込み＆カメラ初期化
  useEffect(() => {
    let isMounted = true;
    async function init() {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      if (isMounted) setLandmarker(poseLandmarker);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // ビデオ要素のサイズを確認
          const checkSize = () => {
            if (videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
              requestAnimationFrame(checkSize);
            }
          };
          checkSize();
        }
      } catch (e) {
        console.error('カメラ初期化エラー', e);
      }
    }
    init();

    return () => {
      isMounted = false;
      landmarker?.close();
      const tracks = videoRef.current?.srcObject instanceof MediaStream
        ? (videoRef.current.srcObject as MediaStream).getTracks()
        : [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  // 姿勢推論ループ
  useEffect(() => {
    let rafId: number;
    const loop = async () => {
      if (landmarker && videoRef.current) {
        // ビデオ要素のサイズを確認
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          rafId = requestAnimationFrame(loop);
          return;
        }

        const results = landmarker.detectForVideo(videoRef.current, performance.now());
        if (results.landmarks[0]) {
          const landmarks = results.landmarks[0];
          const leftShoulder = landmarks[11]; // 左肩
          const leftEar = landmarks[7]; // 左耳
          
          const dx = leftEar.x - leftShoulder.x;
          const dy = leftEar.y - leftShoulder.y;
          const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
          const now = Date.now();
          const isBad = angle > 50;

          if (isBad) {
            if (!badStartTime) {
              setBadStartTime(now);
            } else if (
              now - badStartTime > BAD_THRESHOLD_MS &&
              now - lastAlertTime > COOLDOWN_MS
            ) {
              onBadPosture();
              setLastAlertTime(now);
              setBadStartTime(now);
            }
          } else {
            setBadStartTime(null);
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [landmarker, badStartTime, lastAlertTime, onBadPosture]);

  return { videoRef };
}

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
  const [badDetected, setBadDetected] = useState<boolean>(false);

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
          const nose = landmarks[0]; // 鼻
          const neck = landmarks[11]; // 首（左肩）
          const chest = landmarks[12]; // 胸（右肩）
          
          // 首から胸へのベクトル（水平方向の基準）
          const chestVector = {
            x: chest.x - neck.x,
            y: chest.y - neck.y
          };
          
          // 首から鼻へのベクトル
          const headVector = {
            x: nose.x - neck.x,
            y: nose.y - neck.y
          };
          
          // 内積を計算
          const dotProduct = chestVector.x * headVector.x + chestVector.y * headVector.y;
          
          // ベクトルの長さを計算
          const chestLength = Math.sqrt(chestVector.x * chestVector.x + chestVector.y * chestVector.y);
          const headLength = Math.sqrt(headVector.x * headVector.x + headVector.y * headVector.y);
          
          // 角度を計算（ラジアンから度に変換）
          const angle = Math.acos(dotProduct / (chestLength * headLength)) * (180 / Math.PI);
          
          // 首が前に傾いているかどうかを判定（垂直方向の成分を重視）
          const verticalComponent = Math.abs(headVector.y / headLength);
          const isBad = verticalComponent > 0.2 && verticalComponent < 0.8; // 0.8以上の場合は良い姿勢と判定
          
          console.log('垂直成分:', verticalComponent, '悪い姿勢:', isBad);
          const now = Date.now();

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
              setBadDetected(true);
            }
          } else {
            setBadStartTime(null);
            setBadDetected(false);
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [landmarker, badStartTime, lastAlertTime, onBadPosture]);

  return { videoRef, badDetected };
}

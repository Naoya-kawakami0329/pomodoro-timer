"use client";

import { Card, CardContent, CardHeader, CardTitle,CardFooter} from "@/components/ui/card";
import Controls from "./Controls";
import MetadataUpdater from "./MetadataUpdater";
import TimerDisplay from "./TimerDisplay";
import { useState, useEffect } from "react";
import { playNotificationSound } from "@/utils/sound";

//タイマーのモードをを表す型
type Mode = "work" | "break";

export default function TimerApp() {
  //タイマーの実行状態を管理するState
  const [isRunning, setIsRunning] = useState(false);
  //タイマーの残り時間を保持する状態関数
  const [timeleft, setTimeleft] = useState({ minutes: 25, seconds: 0 });
  //タイマーのモードを管理する状態関数
  const [mode, setMode] = useState<Mode>("work");
  //タイマーのモードを切り替える関数
  const toggleMode = () => {
    //モードを切り替える
    const newMode = mode === "work" ? "break" : "work";
    setMode(newMode);
    //タイマーの残り時間をリセットする
    //作業モードなら25分、休憩モードなら5分
    setTimeleft({ minutes: newMode === "work" ? 25 : 5, seconds: 0 });
    //タイマーを停止する
    setIsRunning(false);
    //タイマーのモードを切り替える
    setMode(mode === "work" ? "break" : "work");
  };
  //タイマーの実行関数
  const handleStart = () => {
    setIsRunning(!isRunning);
  };

  //リセットボタンのハンドラ
  const handleReset=()=>{
    setIsRunning(false);
    setTimeleft({minutes:mode==="work"?25:5,seconds:0});
  }

  useEffect(() => {
    //setIntervalの戻り値(タイマーID)を保持する関数
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => {
        setTimeleft((prev) => {
          if (prev.seconds === 0) {
            //分が0秒が0の場合、タイマーを停止する
            if (prev.minutes === 0) {
              setIsRunning(false);
              toggleMode();//モードを切り替える
              void playNotificationSound(); //通知音を再生
              return prev; //現在の状態(0分、0秒)を返す
            }

            return { minutes: prev.minutes - 1, seconds: 59 };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1); //動作確認のために1ミリ秒ごとに実行
    }
    //クリーンアップ関数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning]);

  
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
           {mode==="work"?"作業モード":"休憩モード"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <TimerDisplay minutes={timeleft.minutes} seconds={timeleft.seconds} mode={mode} />
          <MetadataUpdater minutes={timeleft.minutes} seconds={timeleft.seconds} mode={mode} />
          <Controls
            onStart={handleStart}
            onReset={handleReset}
            onModeToggle={toggleMode}
            isRunning={isRunning}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {mode==="work"?"作業モード":"休憩モード"}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

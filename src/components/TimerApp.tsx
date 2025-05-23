"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import Controls from "./Controls";
import MetadataUpdater from "./MetadataUpdater";
import RefreshSuggestion from "./RefreshSuggestion";
import TimerDisplay from "./TimerDisplay";
import { useState, useEffect} from "react";
import { useReward } from "react-rewards";
import { playNotificationSound } from "@/utils/sound";
import { Switch } from "@/components/ui/switch";
import { generateRefreshSuggestion } from "@/utils/gemini";

//タイマーのモードをを表す型
type Mode = "work" | "break";

export default function TimerApp() {
  const { reward: confetti} = useReward(
    "confettiReward",
    "confetti",
    {
      elementCount: 100,
      spread: 70,
      decay: 0.93,
      lifetime: 150,
    },
  );
  //タイマーの実行状態を管理するState
  const [isRunning, setIsRunning] = useState(false);

  //作業時間を管理する状態変数
  const [workDuration, setWorkDuration] = useState(25);

  //休憩時間を管理する状態変数
  const [breakDuration, setBreakDuration] = useState(5);

  //タイマーの残り時間を保持する状態関数
  const [timeleft, setTimeleft] = useState({
    minutes: workDuration,
    seconds: 0,
  });

  //タイマーのモードを管理する状態関数
  const [mode, setMode] = useState<Mode>("work");

  //自動開始の設定
  const [autoStart, setAutoStart] = useState(false);

  //リフレッシュ提案
  const [refreshSuggestion, setRefreshSuggestion] = useState<string | null>(
    null,
  );

  //タイマーのモードを切り替える関数
  const toggleMode = () => {
    //モードを切り替える
    const newMode = mode === "work" ? "break" : "work";
    setMode(newMode);
    //タイマーの残り時間をリセットする
    //作業モードなら25分、休憩モードなら5分
    setTimeleft({
      minutes: newMode === "work" ? workDuration : breakDuration,
      seconds: 0,
    });
    if (newMode === "break") {
      generateRefreshSuggestion()
        .then((suggestion) => {
          setRefreshSuggestion(suggestion);
        })
        .catch(console.error);
    }

    //自動開始の設定が有効ならタイマーを自動的に開始する
    setIsRunning(autoStart);
    //タイマーのモードを切り替える
    setMode(mode === "work" ? "break" : "work");
  };
  //タイマーの実行関数
  const handleStart = () => {
    setIsRunning(!isRunning);
  };

  //リセットボタンのハンドラ
  const handleReset = () => {
    setIsRunning(false);
    setTimeleft({ minutes: mode === "work" ? workDuration : 5, seconds: 0 });
  };

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

              if (mode === "work") {
                void confetti();
              }
              void playNotificationSound(); //通知音を再生
              //少し遅延させてからモード切り替えと自動開始を実行
              setTimeout(() => {
                toggleMode(); //モードを自動的に切り替える
              }, 1000);
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <span
        id="confettiReward"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {mode === "work" ? "作業モード" : "休憩モード"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <TimerDisplay
            minutes={timeleft.minutes}
            seconds={timeleft.seconds}
            mode={mode}
          />
          <MetadataUpdater
            minutes={timeleft.minutes}
            seconds={timeleft.seconds}
            mode={mode}
          />
          <Controls
            onStart={handleStart}
            onReset={handleReset}
            onModeToggle={toggleMode}
            isRunning={isRunning}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 w-full max-w-[200px] mx-auto">
          {/* 作業時間の設定 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-medium min-w-[4.5rem]">
              作業時間
            </label>
            <select
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 cursor-pointer focus:ring-blue-500"
              value={workDuration}
              onChange={(e) => {
                const newDuration = parseInt(e.target.value);
                setWorkDuration(newDuration);
                if (mode === "work" && !isRunning) {
                  setTimeleft({ minutes: newDuration, seconds: 0 });
                }
              }}
            >
              {[5, 10, 15, 25, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}分
                </option>
              ))}
            </select>
          </div>
          {/* 休憩時間の設定 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-medium min-w-[4.5rem]">
              休憩時間
            </label>
            <select
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={breakDuration}
              onChange={(e) => {
                const newDuration = parseInt(e.target.value);
                setBreakDuration(newDuration);
                if (mode === "break" && !isRunning) {
                  setTimeleft({ minutes: newDuration, seconds: 0 });
                }
              }}
            >
              {[1, 2, 3, 5, 10].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}分
                </option>
              ))}
            </select>
          </div>
          {/* 自動開始の設定 */}
          <div className="flex items-center gap-2 w-full justify-between">
            <label className="text-sm text-medium min-w-[4.5rem]">
              自動開始
            </label>
            <Switch
              checked={autoStart}
              onCheckedChange={() => {
                setAutoStart(!autoStart);
              }}
              className="cursor-pointer"
            />
          </div>
        </CardFooter>
      </Card>
      <RefreshSuggestion
        suggestion={refreshSuggestion}
        onClose={() => setRefreshSuggestion(null)}
      />
    </div>
  );
}

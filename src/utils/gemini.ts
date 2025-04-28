import { GoogleGenerativeAI } from "@google/generative-ai";

//Gemini API　クライアントの初期化
const genAi = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
);

export async function generateRefreshSuggestion(): Promise<string> {
  const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
    #命令
    作業のあいまにできる簡単なリフレッシュ方法を1つ提案してください

    #制約事項
    ー1〜2分程度で終わるもの
    ー室内でできること
    ー道具は不要
    ー体を動かすもの
    ー絵文字を1つ含めること
    ー簡潔に1文の中に収めること
    ー「〜しよう」のように提案する形で終わること
    
    #出力例
    ー大きく背伸びしよう💆‍♂️
    ー室内で少しだけ歩こう🚶‍♀️
    ー腕を振ってみよう💪
    ー目を閉じて深呼吸してみよう👀
    
    `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim();
  } catch (error) {
    console.error("リフレッシュ方法の生成に失敗しました", error);
    return "ゆっくりと深呼吸してみよう👀";
  }
}

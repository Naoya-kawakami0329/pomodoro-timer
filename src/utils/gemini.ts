import { GoogleGenerativeAI } from "@google/generative-ai";

//Gemini API　クライアントの初期化
const genAi = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
);

export async function generateRefreshSuggestion():Promise<string> {
    const model = genAi.getGenerativeModel({model: "gemini-1.5-flash"});
    const prompt ='1分でできる簡単なリフレッシュ方法を教えてください'
    try{
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return text.trim();
        return 'hoge'
    }catch(error){
        console.error('リフレッシュ方法の生成に失敗しました',error);
        throw error;
    }
}
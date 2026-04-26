import { PoeApiWrapper } from "./server/poe";
import * as dotenv from "dotenv";

// 模擬環境變數
process.env.POE_API_KEY = "fon.AJ0N0@lk";

async function test() {
  const poe = new PoeApiWrapper(process.env.POE_API_KEY!);
  
  console.log("--- Testing AI Chat ---");
  try {
    const reply = await poe.chat("你好，請自我介紹", "gemini-2.5-flash");
    console.log("Reply:", reply);
  } catch (e) {
    console.error("Chat failed:", e);
  }

  console.log("\n--- Testing AI Diagnosis ---");
  try {
    const diagnosis = await poe.diagnoseStock("AAPL");
    console.log("Diagnosis:", diagnosis);
  } catch (e) {
    console.error("Diagnosis failed:", e);
  }
}

test();

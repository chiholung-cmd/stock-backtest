async function test() {
  const apiKey = "fon.AJ0N0@lk";
  // 如果這是 Poe 的 API Key，通常它是用於某些特定的代理或 SDK
  // 這裡我們嘗試直接調用一些常見的 Poe 代理地址（如果有）
  // 或者檢查格式。fon. 開頭的通常是特定平台的 Token。
  
  console.log("Testing API Key format and basic connectivity...");
  console.log("Key:", apiKey);
  
  // 嘗試作為通用 OpenAI Key (某些轉發站)
  const baseUrls = [
    "https://api.openai.com/v1",
    "https://api.anthropic.com/v1",
    "https://api.deepseek.com/v1"
  ];
  
  for (const baseUrl of baseUrls) {
    console.log(`\nTrying ${baseUrl}...`);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // generic
          messages: [{role: "user", content: "hi"}]
        })
      });
      console.log(`Status: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 100)}`);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}
test();

// 由於是測試，直接用 fetch 模擬 invokeLLM 的行為，或者簡單調用編譯後的代碼
// 這裡我們直接測試 API Key 是否能通
async function test() {
  const apiKey = "fon.AJ0N0@lk";
  const url = "https://forge.manus.im/v1/chat/completions";
  
  console.log("--- Testing Poe API Key with Forge ---");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Success! Response:", data.choices[0].message.content);
    } else {
      const err = await response.text();
      console.error("Failed! Status:", response.status, "Error:", err);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();

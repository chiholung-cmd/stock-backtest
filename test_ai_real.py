from openai import OpenAI
import os

client = OpenAI(
    api_key="fon.AJ0N0@lk",
    base_url="https://api.openai.com/v1"
)

def test():
    print("--- Testing API Key with OpenAI API ---")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hi"}]
        )
        print("Success! Response:", response.choices[0].message.content)
    except Exception as e:
        print("Failed!", str(e))

if __name__ == "__main__":
    test()

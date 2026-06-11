#!/usr/bin/env python3
import os
import sys
import json
import subprocess

# Ensure required libraries are installed
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Installing google-genai...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai"])
    except subprocess.CalledProcessError:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai", "--break-system-packages"])
        except subprocess.CalledProcessError as e:
            print(f"Failed to install google-genai: {e}", file=sys.stderr)
            sys.exit(1)
    from google import genai
    from google.genai import types

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    # Load existing data as context
    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            current_data = json.load(f)
    except Exception as e:
        print(f"Error loading current data: {e}", file=sys.stderr)
        sys.exit(1)

    # Initialize Gemini client
    client = genai.Client(api_key=api_key)

    prompt = f"""
You are an expert financial and pricing analyst helper.
We maintain an interactive KI Video platform pricing database in JSON format.
Your task is to search the web using Google Search for the latest pricing info, recalculate the cost per 10-second clip in Euros, and output the updated JSON.

Current Database:
{json.dumps(current_data, indent=2, ensure_ascii=False)}

Rules for calculation:
- Use current exchange rate or fallback to: 1 USD = 0.86 EUR.
- Value `v` is the Euro cost for a single 10-second clip.
- Formula for subscription plans: v = (plan_price / monthly_credits) * credits_per_clip.
  - Kling 3.0: 1080p with Start-frame/Image-ref = 12 credits.
  - Kling 3.0: 720p without ref = 6 credits.
  - Seedance 2.0: 1080p without ref = 10 credits.
  - Seedance 2.0 Fast: 720p without ref = 5 credits.
  - For others, calculate proportionally or keep the existing proportion if pricing per credit hasn't changed.
- Search for:
  1. Kling AI (klingai.com) subscription plans (Premier, Ultra) monthly and yearly prices.
  2. Higgsfield AI (higgsfield.ai) subscription plans (Ultra, Pro) monthly and yearly prices, and check if the promotional discount (Aktion) is still active.
  3. Dreamina (dreamina.com) pricing / subscription plans (Advanced) monthly and yearly.
  4. Magnific AI (magnific.ai) Enterprise plan pricing.
  5. Flora Pro subscription pricing.
  6. Atlas Cloud, ByteDance official API, EvoLink API pricing per token / million pixels for Kling 3.0 / Seedance 2.0.

Calculate the new values `v` in Euro. If any pricing has changed, update the `v` value, and update the description `d` or name `n` if there are new details (e.g. new credit limits, model versions, or active promotions).
Keep the exact same schema structure:
[
  {{
    "n": "Name",
    "d": "Description",
    "v": float (cost in EUR),
    "c": "CSS color class (api, higgs, klingd, magnific, dreamina, flora)",
    "res": "Resolution (1080p, 720p)",
    "model": "Model (Seedance 2.0, Seedance 2.0 Fast, Kling 3.0)",
    "ref": "Reference type (ohne, bild, video)",
    "bind": "Subscription type (jahr, monat)"
  }},
  ...
]

Return ONLY the updated JSON array in your response. No markdown code blocks, no explanation, just raw valid JSON.
"""

    print("Querying Gemini with Google Search grounding...")
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],
                response_mime_type="application/json"
            ),
        )
        
        # Parse output to verify it's valid JSON
        result_text = response.text.strip()
        
        # Clean any potential markdown wrapping if the model ignored response_mime_type instructions
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()

        updated_data = json.loads(result_text)
        
        # Write back to file
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(updated_data, f, indent=4, ensure_ascii=False)
            
        print("Successfully updated data.json with latest prices!")
        
    except Exception as e:
        print(f"Error executing Gemini request: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

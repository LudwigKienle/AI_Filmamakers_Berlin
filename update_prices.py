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
We maintain an interactive KI Generation platform pricing database in JSON format, which includes both Video- and Image-generation models.
Your task is to search the web using Google Search for the latest pricing info, recalculate the cost per generation (per 10-second clip for Video models, per single image for Image models) in Euros, and output the updated JSON.

Current Database:
{json.dumps(current_data, indent=2, ensure_ascii=False)}

Rules for calculation:
- Use current exchange rate or fallback to: 1 USD = 0.86 EUR.
- Value `v` is the Euro cost for a single generation (per 10s clip for video, per single image for image).
- Formula for subscription video plans: v = (plan_price / monthly_credits) * credits_per_clip.
  - Kling 3.0: 1080p with Start-frame/Image-ref = 12 credits; 720p without ref = 6 credits.
  - Seedance 2.0: 1080p without ref = 10 credits; Fast 720p without ref = 5 credits.
  - Runway Gen-3 Alpha (Standard plan annual: $12/mo for 625 credits): Gen-3 Alpha costs 10 credits/s (100 credits for 10s -> $1.92); Gen-3 Alpha Turbo costs 5 credits/s (50 credits for 10s -> $0.96); Gen-4.5 costs 25 credits/s (250 credits for 10s -> $4.80).
  - Luma Ray 3.2 (Agents Plus plan: $30/mo for 10,000 credits): Ray 3.2 720p costs 50 credits per 5s (100 credits for 10s -> $0.30); Ray 3.2 1080p costs 100 credits per 5s (200 credits for 10s -> $0.60).
  - MiniMax Hailuo 2.3 (API): standard 6s clip costs ~$0.20 -> 10s equivalent clip is ~$0.33.
- Formula for image models:
  - Midjourney Basic: $10/mo for ~200 fast images -> $0.05 per image. Midjourney Standard: $30/mo for ~900 fast images -> $0.033 per image.
  - OpenAI DALL-E 3 Standard: $0.040 per image. OpenAI DALL-E 3 HD: $0.080 per image.
  - FLUX.1 [1.1 Pro]: $0.040 per image on Replicate/Fal.ai.
  - FLUX.1 [Dev]: $0.025 per image on Replicate/Fal.ai.
  - FLUX.1 [Schnell]: $0.003 per image on Replicate/Fal.ai.
  - FLUX.2 [max]: $0.090 per image.
  - Stable Diffusion 3.5 Large: $0.065 per image (6.5 Stability credits). Stable Diffusion 3.5 Medium: $0.035 per image (3.5 Stability credits).
  - Google Imagen 3: Standard quality is $0.030 per image; Fast is $0.015 per image.
  - xAI Grok Imagine: $0.020 per image.
  - Ideogram v4: Turbo quality is $0.030 per image; Quality is $0.100 per image.
  - Recraft v3: Raster image is $0.040 per image; Vector is $0.080 per image.
  - Adobe Firefly v3: $9.99/mo for 250 credits -> $0.040 per image.
  - Google Nano Banana 2: $0.067 per image. Google Nano Banana Pro: $0.139 per image.
  - ByteDance Seedream v5: $0.032 per image.
  - OpenAI GPT Image 2: Standard/Medium is $0.050 per image; High Quality is $0.180 per image.
- Search for:
  1. Kling AI (klingai.com) subscription plans (Premier, Ultra) monthly/yearly prices.
  2. Higgsfield AI (higgsfield.ai) subscription plans (Ultra, Pro) monthly/yearly prices.
  3. Dreamina (dreamina.com) pricing / subscription plans (Advanced).
  4. Magnific AI (magnific.ai) Enterprise plan pricing.
  5. Flora Pro subscription pricing.
  6. Midjourney (midjourney.com) Basic/Standard monthly/yearly plan pricing.
  7. OpenAI DALL-E 3 and GPT Image 2 API pricing.
  8. FLUX.1 and FLUX.2 API pricing on Replicate, Fal.ai, or Together AI.
  9. Stable Diffusion 3.5 Large and Medium API pricing on Stability AI.
  10. Runway ML (runwayml.com) subscription plans (Standard, Pro) monthly/yearly prices and credit values.
  11. Luma AI (lumalabs.ai) subscription plans (Dream Machine / Agents Plus) monthly/yearly prices.
  12. MiniMax / Hailuo AI API pricing and subscription plans.
  13. Google Vertex AI/AI Studio Imagen 3 and Nano Banana API pricing.
  14. xAI Grok Imagine API pricing.
  15. Ideogram (ideogram.ai) API and subscription plans.
  16. Recraft (recraft.ai) API and subscription plans.
  17. Adobe Firefly subscription pricing.
  18. ByteDance Seedream v5 / 5.0 Lite API pricing.

Calculate the new values `v` in Euro. If any pricing has changed, update the `v` value, and update the description `d` or name `n` if there are new details.
Keep the exact same schema structure:
[
  {
    "n": "Name",
    "d": "Description",
    "v": float (cost in EUR),
    "c": "CSS color class (api, higgs, klingd, magnific, dreamina, flora, midjourney, openai, flux, stability, runway, luma, hailuo, ideogram, recraft, adobe, imagen, grok, nanbanan2, nanbananpro, seedream5, flux2max)",
    "res": "Resolution (1080p, 720p, 1024px, HD, Vector, 2K, 4K)",
    "model": "Model (Seedance 2.0, Seedance 2.0 Fast, Kling 3.0, Midjourney v6, DALL-E 3, FLUX.1 Pro, FLUX.1 Dev, FLUX.1 Schnell, Stable Diffusion 3.5, Runway Gen-3, Runway Gen-3 Turbo, Runway Gen-4.5, Luma Ray 3.2, MiniMax Hailuo 2.3, Imagen 3, Grok Imagine, Ideogram v4, Recraft v3, Adobe Firefly v3, Nano Banana 2, Nano Banana Pro, Seedream v5, FLUX.2 [max], GPT Image 2)",
    "ref": "Reference type (ohne, bild, video)",
    "pay": "Payment model (abo, payuse)",
    "type": "Media type (video, image)"
  },
  ...
]

Return the updated JSON array wrapped inside a markdown code block (e.g. ```json ... ```). Do not add any extra explanations, just the code block with the JSON array.
"""

    print("Querying Gemini with Google Search grounding...")
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],
            ),
        )
        
        # Parse output to verify it's valid JSON
        result_text = response.text.strip()
        
        # Extract content between ```json and ```
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
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

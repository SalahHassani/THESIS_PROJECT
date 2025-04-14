import os
import sys

# Add the 'sd2' folder to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import time
import torch
from PIL import Image
from transformers import CLIPTokenizer

import model_loader
import pipeline

import re

# Setup device
DEVICE = "cpu"
ALLOW_CUDA = False
ALLOW_MPS = False

if torch.cuda.is_available() and ALLOW_CUDA:
    DEVICE = "cuda"
elif (torch.backends.mps.is_built() and torch.backends.mps.is_available()) and ALLOW_MPS:
    DEVICE = "mps"

print(f"✅ Using device: {DEVICE}")

# Load tokenizer and model
tokenizer = CLIPTokenizer(
    "back_end/diffusion_Model/data/tokenizer_vocab.json",
    merges_file="back_end/diffusion_Model/data/tokenizer_merges.txt"
)

model_file = "back_end/diffusion_Model/data/v1-5-pruned-emaonly.ckpt"
models = model_loader.preload_models_from_standard_weights(model_file, DEVICE)

BASE_OUTPUT_DIR = os.path.abspath(os.path.join("..", "Model", "front_end", "images"))

PREVIEW_IMAGE_DIR = os.path.abspath(os.path.join("..", "Model", "back_end", "diffusion_Model", "images"))

def clear_folder(folder_path):
    for file in os.listdir(folder_path):
        if file.lower().endswith((".png", ".jpg", ".jpeg")):
            os.remove(os.path.join(folder_path, file))


def expand_prompt(prompt: str, count: int) -> list:
    """
    Expand a prompt into `count` parts using commas or periods.
    If parts < count → pad with the last part.
    If parts > count → truncate to count.
    """
    # Split prompt by comma or period
    parts = re.split(r'[,.]', prompt)
    
    # Strip whitespace and remove empty entries
    parts = [p.strip() for p in parts if p.strip()]

    # Handle edge cases
    if not parts:
        return [prompt] * count  # fallback

    if len(parts) >= count:
        return parts[:count]
    else:
        return parts + [parts[-1]] * (count - len(parts))




def generate_image(prompt: str, image_type: str = "guest_user_images", count: int = 1, epochs: int = 1, inpaint: bool = False) -> list:
    """
    Generate image(s) for the given prompt and save them in a clean folder.
    - Always clears the folder before generation.
    - registered_users: expands prompt and generates multiple images.
    - Others: generates only 1 image from the original prompt.
    """
    output_dir = os.path.join(BASE_OUTPUT_DIR, image_type)
    os.makedirs(output_dir, exist_ok=True)

    # ✅ Clear folder before generation
    clear_folder(output_dir)

    input_image = None
    # Comment to disable image to image
    if inpaint:
        input_image = Image.open(os.path.join(PREVIEW_IMAGE_DIR, "preview_1.png"))


    # 🧠 Expand only for registered users
    if image_type == "shassani":
        try:
            prompts = expand_prompt(prompt, count)
        except Exception as e:
            print(f"⚠️ Prompt expansion failed: {e} — fallback to repeating original.")
            prompts = [prompt] * count
    else:
        prompts = [prompt]  # Only one image needed for preview/guest

    generated_paths = []

    print(f"🧪 Generating {len(prompts)} image(s) for {image_type}, InPainting {inpaint}")

    for i, current_prompt in enumerate(prompts):
        full_prompt = f"{current_prompt}. A comic character."

        print(f"🧪 Generating image {i + 1}/{len(prompts)} → {count}")

        output_image = pipeline.generate(
            prompt=full_prompt,
            uncond_prompt="",
            input_image=None,
            strength=0.8,
            do_cfg=True,
            cfg_scale=8,
            sampler_name="ddpm",
            n_inference_steps=epochs,
            seed=42 + i,
            models=models,
            device=DEVICE,
            idle_device="cpu",
            tokenizer=tokenizer,
        )

        filename = f"{image_type}_{i + 1}.png"
        file_path = os.path.join(output_dir, filename)

        Image.fromarray(output_image).save(file_path)
        generated_paths.append(f"/images/{image_type}/{filename}")

        if image_type == "preview":
            os.makedirs(PREVIEW_IMAGE_DIR, exist_ok=True)  # Ensure directory exists
            preview_path = os.path.join(PREVIEW_IMAGE_DIR, filename)
            Image.fromarray(output_image).save(preview_path)


        print(f"✅ Saved: {file_path}")

    return generated_paths

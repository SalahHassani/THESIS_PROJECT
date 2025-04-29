import os
import sys
import re
import time
import torch
from PIL import Image
from transformers import CLIPTokenizer

# ==========================
# 🔧 PATH & DEPENDENCIES SETUP
# ==========================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import model_loader
import pipeline

# ==========================
# ⚙️ DEVICE CONFIGURATION
# ==========================
DEVICE = "cpu"
ALLOW_CUDA = False
ALLOW_MPS = False

if torch.cuda.is_available() and ALLOW_CUDA:
    DEVICE = "cuda"
elif (torch.backends.mps.is_built() and torch.backends.mps.is_available()) and ALLOW_MPS:
    DEVICE = "mps"

print(f"✅ Using device: {DEVICE}")

# ==========================
# 🧠 LOAD MODELS & TOKENIZER
# ==========================
tokenizer = CLIPTokenizer(
    "back_end/diffusion_Model/data/tokenizer_vocab.json",
    merges_file="back_end/diffusion_Model/data/tokenizer_merges.txt"
)

model_file = "back_end/diffusion_Model/data/v1-5-pruned-emaonly.ckpt"
models = model_loader.preload_models_from_standard_weights(model_file, DEVICE)

# ==========================
# 📁 PATH CONSTANTS
# ==========================
BASE_OUTPUT_DIR = os.path.abspath(os.path.join("..", "Model", "front_end", "images"))
PREVIEW_IMAGE_DIR = os.path.abspath(os.path.join("..", "Model", "back_end", "diffusion_Model", "images"))

# ==========================
# 🧼 FOLDER UTILITY
# ==========================
def clear_folder(folder_path):
    if not os.path.exists(folder_path):
        os.makedirs(folder_path) 
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        if os.path.isfile(file_path):
            os.remove(file_path)  


# ==========================
# 🪄 PROMPT EXPANSION LOGIC
# ==========================
def expand_prompt(prompt: str, count: int) -> list:
    parts = re.split(r'[,.]', prompt)
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        return [prompt] * count
    return parts[:count] if len(parts) >= count else parts + [parts[-1]] * (count - len(parts))

# ==========================
# 🖼️ IMAGE GENERATION LOGIC
# ==========================
def generate_image(prompt: str, image_type: str = "guest_user_images", count: int = 1, epochs: int = 1, inpaint: bool = False) -> list:
    output_dir = os.path.join(BASE_OUTPUT_DIR, image_type)
    os.makedirs(output_dir, exist_ok=True)
    clear_folder(output_dir)

    input_image = None
    if inpaint:
        input_image = Image.open(os.path.join(PREVIEW_IMAGE_DIR, "preview_1.png"))
    else:
        clear_folder(PREVIEW_IMAGE_DIR)

    prompts = expand_prompt(prompt, count) if image_type == "shassani" else [prompt]

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
            os.makedirs(PREVIEW_IMAGE_DIR, exist_ok=True)
            preview_path = os.path.join(PREVIEW_IMAGE_DIR, filename)
            Image.fromarray(output_image).save(preview_path)

        print(f"✅ Saved: {file_path}")

    return generated_paths

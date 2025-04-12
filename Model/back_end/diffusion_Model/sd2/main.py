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


def clear_folder(folder_path):
    for file in os.listdir(folder_path):
        if file.lower().endswith((".png", ".jpg", ".jpeg")):
            os.remove(os.path.join(folder_path, file))


def generate_image(prompt: str, image_type: str = "guest_user_images", count: int = 1) -> list:
    """
    Generate image(s) for the given prompt and save them to the correct folder.
    For 'preview' and 'guest_user_images', clears the folder before saving.
    For 'shassani', appends numbered images.
    """
    base_prompt = f"{prompt}. A comic character."
    output_dir = os.path.join(BASE_OUTPUT_DIR, image_type)
    os.makedirs(output_dir, exist_ok=True)

    # Clear folder if it's preview or guest
    if image_type in ["preview", "guest_user_images"]:
        clear_folder(output_dir)
        index_start = 1
    else:
        existing = [
            f for f in os.listdir(output_dir)
            if f.endswith((".png", ".jpg", ".jpeg")) and f.startswith(image_type)
        ]
        index_start = len(existing) + 1

    generated_paths = []

    for i in range(count):
        print(f"🧪 Generating {image_type} image {i + 1}/{count}...")

        output_image = pipeline.generate(
            prompt=base_prompt,
            uncond_prompt="",
            input_image=None,
            strength=0.8,
            do_cfg=True,
            cfg_scale=8,
            sampler_name="ddpm",
            n_inference_steps=3,
            seed=42 + i,
            models=models,
            device=DEVICE,
            idle_device="cpu",
            tokenizer=tokenizer,
        )

        filename = f"{image_type}_{index_start + i}.png"
        file_path = os.path.join(output_dir, filename)

        Image.fromarray(output_image).save(file_path)
        generated_paths.append(f"/images/{image_type}/{filename}")
        print(f"✅ Saved: {file_path}")

    return generated_paths

import os
import sys
import time 
import model_loader
import pipeline
from PIL import Image
from transformers import CLIPTokenizer
import torch



# Set device for computation
DEVICE = "cpu"
ALLOW_CUDA = False
ALLOW_MPS = False

if torch.cuda.is_available() and ALLOW_CUDA:
    DEVICE = "cuda"
elif (torch.backends.mps.is_built() and torch.backends.mps.is_available()) and ALLOW_MPS:
    DEVICE = "mps"

print(f"Using device: {DEVICE}")

# Load tokenizer and model
tokenizer = CLIPTokenizer("back_end/diffusion_Model/data/tokenizer_vocab.json", merges_file="back_end/diffusion_Model/data/tokenizer_merges.txt")
model_file = "back_end/diffusion_Model/data/v1-5-pruned-emaonly.ckpt"
models = model_loader.preload_models_from_standard_weights(model_file, DEVICE)

# Define output directory (Save images in front_end/images/)
OUTPUT_DIR = os.path.abspath(os.path.join("..", "Model", "front_end", "images", "guest_user_images"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_image(prompt: str) -> str:

    print(f"\nGenerating image for prompt: {prompt}")

    prompt = prompt + ". A commic character."
    # Start timer
    start_time = time.time()

    # Image generation parameters
    uncond_prompt = ""
    do_cfg = True
    cfg_scale = 8
    strength = 0.8
    sampler = "ddpm"
    num_inference_steps = 20
    seed = 42 

    # Generate image
    output_image = pipeline.generate(
        prompt=prompt,
        uncond_prompt=uncond_prompt,
        input_image=None,
        strength=strength,
        do_cfg=do_cfg,
        cfg_scale=cfg_scale,
        sampler_name=sampler,
        n_inference_steps=num_inference_steps,
        seed=seed,
        models=models,
        device=DEVICE,
        idle_device="cpu",
        tokenizer=tokenizer,
    )

    # Define image path in the front_end/images/guest_user_images directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image_filename = f"output_{seed}.png"
    image_path = os.path.join(OUTPUT_DIR, image_filename)

    # Save image
    Image.fromarray(output_image).save(image_path)
    print(f"\nImage Saved at: {image_path}")

    # Calculate time taken
    end_time = time.time()
    elapsed_time = end_time - start_time
    print(f"Image saved at {image_path} (Generation Time: {elapsed_time:.2f} seconds)")

    return image_filename 

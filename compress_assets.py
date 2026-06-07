import os
import sys
from PIL import Image

def compress_image(file_path):
    try:
        orig_size = os.path.getsize(file_path)
        if orig_size == 0:
            return 0, 0

        ext = os.path.splitext(file_path)[1].lower()
        
        # Load image
        img = Image.open(file_path)
        
        # Temporary path to save compressed image
        temp_path = file_path + ".tmp"
        
        if ext == '.png':
            # Quantize RGBA or RGB to 8-bit palette (256 colors) preserving transparency
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                quantized = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                quantized.save(temp_path, format='PNG', optimize=True)
            else:
                img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256).save(temp_path, format='PNG', optimize=True)
        elif ext in ('.jpg', '.jpeg'):
            # Save JPEG with optimized quality
            img.save(temp_path, format='JPEG', optimize=True, quality=80)
        elif ext == '.webp':
            # Save WebP with optimized quality
            img.save(temp_path, format='WEBP', optimize=True, quality=80)
        else:
            return 0, 0
            
        new_size = os.path.getsize(temp_path)
        
        # If the compressed version is indeed smaller, overwrite the original
        if new_size < orig_size:
            os.replace(temp_path, file_path)
            savings = orig_size - new_size
            pct = (savings / orig_size) * 100
            print(f"Compressed {os.path.basename(file_path)}: {orig_size/1024:.1f}KB -> {new_size/1024:.1f}KB ({pct:.1f}% saved)")
            return orig_size, new_size
        else:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            print(f"Skipped {os.path.basename(file_path)}: Compression did not reduce size")
            return orig_size, orig_size
            
    except Exception as e:
        print(f"Error compressing {file_path}: {e}")
        return 0, 0

def main():
    # Directory to scan
    target_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "dashboard", "frontend", "public", "assets")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "dashboard", "frontend", "public"))
    ]
    
    image_exts = {'.png', '.jpg', '.jpeg', '.webp'}
    
    total_orig = 0
    total_new = 0
    processed_count = 0
    
    # Track processed paths to avoid double-processing
    processed_paths = set()
    
    print("Starting image compression algorithm...")
    
    for target_dir in target_dirs:
        if not os.path.exists(target_dir):
            continue
        
        print(f"Scanning directory: {target_dir}")
        for root, _, files in os.walk(target_dir):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in image_exts:
                    file_path = os.path.join(root, file)
                    abs_path = os.path.abspath(file_path)
                    
                    if abs_path in processed_paths:
                        continue
                    processed_paths.add(abs_path)
                    
                    orig_s, new_s = compress_image(abs_path)
                    if orig_s > 0:
                        total_orig += orig_s
                        total_new += new_s
                        processed_count += 1
                        
    if processed_count > 0:
        total_savings = total_orig - total_new
        total_pct = (total_savings / total_orig) * 100
        print("\nCompression Complete Summary:")
        print(f"Total images processed: {processed_count}")
        print(f"Original total size: {total_orig/1024/1024:.2f} MB")
        print(f"Compressed total size: {total_new/1024/1024:.2f} MB")
        print(f"Total space saved: {total_savings/1024/1024:.2f} MB ({total_pct:.1f}% saved)")
    else:
        print("No images found to process.")

if __name__ == "__main__":
    main()

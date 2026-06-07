import os

def replace_in_file(file_path):
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Check if any variant exists
        low_content = content.lower()
        if 'jirova' not in low_content:
            return False
            
        # Replace preserving casing
        new_content = content
        # Casing combinations
        replacements = [
            ("Jirova Care", "Jivora Care"),
            ("jirova care", "jivora care"),
            ("JIROVA CARE", "JIVORA CARE"),
            ("Jirova", "Jivora"),
            ("jirova", "jivora"),
            ("JIROVA", "JIVORA"),
        ]
        
        for old, new in replacements:
            new_content = new_content.replace(old, new)
            
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
            
    except Exception as e:
        print(f"Error reading/writing {file_path}: {e}")
        
    return False

def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    print(f"Scanning from root: {root_dir}")
    
    # 1. First find and rename files with 'jirova' in their name
    files_to_rename = []
    for root, dirs, files in os.walk(root_dir):
        # Skip directories
        if any(skip in root for skip in ['.git', 'node_modules', '.next']):
            continue
            
        for file in files:
            if 'jirova' in file.lower():
                old_path = os.path.join(root, file)
                # Compute new filename
                new_file = file
                new_file = new_file.replace("Jirova", "Jivora")
                new_file = new_file.replace("jirova", "jivora")
                new_file = new_file.replace("JIROVA", "JIVORA")
                new_path = os.path.join(root, new_file)
                files_to_rename.append((old_path, new_path))
                
    # Proactively rename files first
    for old, new in files_to_rename:
        try:
            os.rename(old, new)
            print(f"Renamed file: {os.path.basename(old)} -> {os.path.basename(new)}")
        except Exception as e:
            print(f"Error renaming {old} to {new}: {e}")

    # 2. Text replace in all text files recursively
    extensions_to_process = {
        '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.sql', '.bat', '.env', '.example', '.local', '.txt'
    }
    
    updated_files = 0
    for root, dirs, files in os.walk(root_dir):
        # Skip directories
        if any(skip in root for skip in ['.git', 'node_modules', '.next']):
            continue
            
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions_to_process or file in ('.env', '.env.local', 'Dockerfile', 'Makefile', 'README'):
                file_path = os.path.join(root, file)
                if replace_in_file(file_path):
                    print(f"Updated content in: {os.path.relpath(file_path, root_dir)}")
                    updated_files += 1
                    
    print(f"\nReplacement complete. Total files modified: {updated_files}")

if __name__ == "__main__":
    main()

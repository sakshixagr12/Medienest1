import os

files = [
    r"c:\Users\sakshi agrahari\OneDrive\Desktop\MedieNest\dashboard\frontend\app\portal\admission-record\page.tsx",
    r"c:\Users\sakshi agrahari\OneDrive\Desktop\MedieNest\dashboard\frontend\app\demo\portal\admission-record\page.tsx",
    r"c:\Users\sakshi agrahari\OneDrive\Desktop\MedieNest\dashboard\frontend\app\demo1\portal\admission-record\page.tsx"
]

for file in files:
    if not os.path.exists(file):
        print(f"File not found: {file}")
        continue
        
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix 1: Initialize form from database
    content = content.replace(
        "date_admission: data.date_admission ? new Date(data.date_admission).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),",
        "date_admission: data.date_admission ? new Date(new Date(data.date_admission).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),"
    )

    # Fix 2: Saving to database
    content = content.replace(
        "date_admission: summary.date_admission,",
        "date_admission: summary.date_admission ? new Date(summary.date_admission).toISOString() : new Date().toISOString(),"
    )

    # Fix 3: Reset state
    content = content.replace(
        "date_admission: new Date().toISOString().slice(0, 16),",
        "date_admission: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),"
    )

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Dates fixed across all files.")

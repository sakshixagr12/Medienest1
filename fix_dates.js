const fs = require('fs');

const files = [
    "c:\\Users\\sakshi agrahari\\OneDrive\\Desktop\\MedieNest\\dashboard\\frontend\\app\\portal\\admission-record\\page.tsx",
    "c:\\Users\\sakshi agrahari\\OneDrive\\Desktop\\MedieNest\\dashboard\\frontend\\app\\demo\\portal\\admission-record\\page.tsx",
    "c:\\Users\\sakshi agrahari\\OneDrive\\Desktop\\MedieNest\\dashboard\\frontend\\app\\demo1\\portal\\admission-record\\page.tsx"
];

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        continue;
    }
        
    let content = fs.readFileSync(file, 'utf-8');

    // Fix 1: Initialize form from database
    content = content.replace(
        "date_admission: data.date_admission ? new Date(data.date_admission).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),",
        "date_admission: data.date_admission ? new Date(new Date(data.date_admission).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),"
    );

    // Fix 2: Saving to database (replaces all occurrences)
    content = content.split("date_admission: summary.date_admission,").join(
        "date_admission: summary.date_admission ? new Date(summary.date_admission).toISOString() : new Date().toISOString(),"
    );

    // Fix 3: Reset state
    content = content.split("date_admission: new Date().toISOString().slice(0, 16),").join(
        "date_admission: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),"
    );

    fs.writeFileSync(file, content, 'utf-8');
}

console.log("Dates fixed across all files.");

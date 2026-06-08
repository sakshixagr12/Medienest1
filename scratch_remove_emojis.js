const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'scratch' || file.endsWith('.png') || file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.ico') || file.endsWith('.svg')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                if (emojiRegex.test(content)) {
                    console.log('Has emoji:', fullPath);
                    let newContent = content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/gu, '');
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                }
            } catch(e) {}
        }
    }
}

scanDir('c:/Users/ASUS/Desktop/Jivora Care/Jivora CareV1');
console.log('Done scanning and replacing.');

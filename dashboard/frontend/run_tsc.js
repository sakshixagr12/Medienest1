const { execSync } = require('child_process');
const fs = require('fs');
try {
  const output = execSync('npx tsc --noEmit', { encoding: 'utf-8' });
  fs.writeFileSync('tsc_output.txt', output || 'SUCCESS');
} catch (e) {
  fs.writeFileSync('tsc_output.txt', e.stdout || e.stderr || e.message);
}

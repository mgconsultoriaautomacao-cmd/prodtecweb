const fs = require('fs');
const vm = require('vm');

function checkFile(filename) {
  try {
    console.log(`\n========================================`);
    console.log(`Checking ${filename}...`);
    const html = fs.readFileSync(filename, 'utf8');
    const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
    let match;
    let scriptCount = 0;
    let hasErrors = false;

    while ((match = scriptRegex.exec(html)) !== null) {
      scriptCount++;
      const jsCode = match[1];
      if (jsCode.trim().length === 0) continue;

      try {
        new vm.Script(jsCode);
      } catch (err) {
        hasErrors = true;
        console.error(`SYNTAX ERROR FOUND IN SCRIPT #${scriptCount} (length: ${jsCode.length} chars):`);
        console.error(err.message);

        const errorStack = err.stack;
        const lineMatch = errorStack.match(/evalmachine\.<anonymous>:(\d+)/);
        if (lineMatch) {
          const jsLineNumber = parseInt(lineMatch[1], 10);
          console.log(`Error is at JS line: ${jsLineNumber}`);

          const htmlLines = html.split('\n');
          const htmlLinesBeforeScript = html.substring(0, match.index).split('\n');
          const scriptStartLine = htmlLinesBeforeScript.length;
          const targetHtmlLine = scriptStartLine + jsLineNumber - 1;

          console.log(`This corresponds to ${filename} line: ${targetHtmlLine}`);
          console.log("Snippet around error line:");
          for (let i = Math.max(0, targetHtmlLine - 10); i < Math.min(htmlLines.length, targetHtmlLine + 10); i++) {
            const prefix = (i + 1) === targetHtmlLine ? "=> " : "   ";
            console.log(`${prefix}${i + 1}: ${htmlLines[i]}`);
          }
        }
      }
    }
    if (!hasErrors) {
      console.log(`SUCCESS: No syntax errors found in ${filename} across ${scriptCount} script blocks!`);
    }
  } catch (e) {
    console.error(`Error reading or running check for ${filename}:`, e);
  }
}

checkFile('index.html');
checkFile('campo/index.html');
if (fs.existsSync('mapeiro.html')) {
  checkFile('mapeiro.html');
}

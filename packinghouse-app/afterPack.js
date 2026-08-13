const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
    if (context.electronPlatformName !== 'win32') return;

    console.log('\n[HOOK] Replacing native sqlite3 binary with Windows x64 binary...');

    const appOutDir = context.appOutDir; 
    
    const targetNodeFile = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node');
    const win32NodeFile = path.join(context.packager.projectDir, 'win32-binding', 'build', 'Release', 'node_sqlite3.node');

    if (fs.existsSync(win32NodeFile)) {
        try {
            const destDir = path.dirname(targetNodeFile);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(win32NodeFile, targetNodeFile);
            console.log(`[HOOK] ✅ Successfully copied Windows x64 sqlite3 binary to: ${targetNodeFile}`);
        } catch (e) {
            console.error(`[HOOK] ❌ Failed copying Windows binary: ${e.message}`);
        }
    } else {
        console.error(`[HOOK] ⚠️ win32NodeFile not found at: ${win32NodeFile}`);
    }
};

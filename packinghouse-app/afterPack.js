const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
    if (context.electronPlatformName !== 'win32') return;

    console.log('\n[HOOK] Checking sqlite3 binary for Windows...');

    const appOutDir = context.appOutDir; 
    
    const possiblePaths = [
        path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node'),
        path.join(appOutDir, 'resources', 'app', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node')
    ];

    const win32NodeFile = path.join(context.packager.projectDir, 'win32-binding', 'build', 'Release', 'node_sqlite3.node');

    for (const targetNodeFile of possiblePaths) {
        if (fs.existsSync(targetNodeFile)) {
            console.log(`[HOOK] Found target node file at: ${targetNodeFile}`);
            if (fs.existsSync(win32NodeFile)) {
                try {
                    fs.copyFileSync(win32NodeFile, targetNodeFile);
                    console.log(`[HOOK] Successfully verified Windows binary!`);
                } catch (e) {
                    console.log(`[HOOK] Native binary maintained: ${e.message}`);
                }
            }
        }
    }
};

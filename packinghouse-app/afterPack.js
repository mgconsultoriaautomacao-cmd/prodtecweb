const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
    if (context.electronPlatformName !== 'win32') return;

    console.log('\n[HOOK] Running afterPack hook to replace sqlite3 binary for Windows...');

    const appOutDir = context.appOutDir; 
    
    // In sqlite3 v5.x, the node file is often at build/Release/node_sqlite3.node
    const possiblePaths = [
        path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node'),
        path.join(appOutDir, 'resources', 'app', 'node_modules', 'sqlite3', 'build', 'Release', 'node_sqlite3.node')
    ];

    const win32NodeFile = path.join(context.packager.projectDir, 'win32-binding', 'build', 'Release', 'node_sqlite3.node');

    let replaced = false;
    for (const targetNodeFile of possiblePaths) {
        if (fs.existsSync(targetNodeFile)) {
            console.log(`[HOOK] Found Mac binary at: ${targetNodeFile}`);
            if (fs.existsSync(win32NodeFile)) {
                fs.copyFileSync(win32NodeFile, targetNodeFile);
                console.log(`[HOOK] Successfully replaced with Windows binary!`);
                replaced = true;
            } else {
                console.error('[HOOK] ERRO: Prebuilt Windows binary not found at', win32NodeFile);
            }
        }
    }

    if (!replaced) {
        console.error('[HOOK] ERRO: Could not find node_sqlite3.node to replace in the packaged app!');
    }
};

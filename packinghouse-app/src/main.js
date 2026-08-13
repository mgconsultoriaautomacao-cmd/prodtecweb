const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Tratamento global para evitar caixas de diálogo 'A JavaScript error occurred'
process.on('uncaughtException', (error) => {
  console.error('[Main Process Uncaught Exception]:', error);
});

const { initDb } = require('./db');
const { createAppService } = require('./services/appService');
const { syncToSupabase, syncFromSupabase } = require('./services/syncService');
const { analyzeBox } = require('./services/cvService');


let mainWindow = null;
let db = null;
let service = null;

app.disableHardwareAcceleration();
console.log('App: Hardware acceleration disabled.');

function createWindow() {
  console.log('App: Creating window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  console.log('App: index.html loaded.');

  mainWindow.on('closed', () => {
    console.log('App: Window closed.');
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('config:getAll', () => service.configGetAll());
  ipcMain.handle('config:set', (_, payload) => service.configSet(payload));
  ipcMain.handle('auth:login', (_, payload) => service.authLogin(payload));
  ipcMain.handle('auth:check', () => service.authCheck());
  ipcMain.handle('db:reset', () => service.dbReset());

  ipcMain.handle('employees:list', () => service.employeesList());
  ipcMain.handle('employees:add', (_, payload) => service.employeesAdd(payload));
  ipcMain.handle('employees:update', (_, payload) => service.employeesUpdate(payload));
  ipcMain.handle('employees:delete', (_, payload) => service.employeesDelete(payload));

  ipcMain.handle('fruits:list', () => service.fruitsList());
  ipcMain.handle('fruits:add', (_, payload) => service.fruitsAdd(payload));
  ipcMain.handle('fruits:update', (_, payload) => service.fruitsUpdate(payload));
  ipcMain.handle('fruits:delete', (_, payload) => service.fruitsDelete(payload));

  ipcMain.handle('varieties:list', () => service.varietiesList());
  ipcMain.handle('varieties:add', (_, payload) => service.varietiesAdd(payload));
  ipcMain.handle('varieties:update', (_, payload) => service.varietiesUpdate(payload));
  ipcMain.handle('varieties:delete', (_, payload) => service.varietiesDelete(payload));

  ipcMain.handle('parcels:list', () => service.parcelsList());
  ipcMain.handle('parcels:add', (_, payload) => service.parcelsAdd(payload));
  ipcMain.handle('parcels:update', (_, payload) => service.parcelsUpdate(payload));
  ipcMain.handle('parcels:delete', (_, payload) => service.parcelsDelete(payload));

  ipcMain.handle('boxWeights:list', () => service.boxWeightsList());
  ipcMain.handle('boxWeights:add', (_, payload) => service.boxWeightsAdd(payload));
  ipcMain.handle('boxWeights:update', (_, payload) => service.boxWeightsUpdate(payload));
  ipcMain.handle('boxWeights:delete', (_, payload) => service.boxWeightsDelete(payload));

  ipcMain.handle('parcelPairs:list', (_, payload) => service.parcelPairsList(payload || {}));
  ipcMain.handle('parcelPairs:add', (_, payload) => service.parcelPairAdd(payload));
  ipcMain.handle('parcelPairs:remove', (_, payload) => service.parcelPairRemove(payload));
  ipcMain.handle('parcelFruits:list', (_, payload) => service.parcelFruitsList(payload || {}));
  ipcMain.handle('parcelVarieties:list', (_, payload) => service.parcelVarietiesList(payload || {}));

  ipcMain.handle('context:get', (_, payload) => service.contextGet(payload || {}));
  ipcMain.handle('context:set', (_, payload) => service.contextSet(payload || {}));

  ipcMain.handle('scan:submit', (_, payload) => service.scanSubmit(payload));
  ipcMain.handle('state:get', (_, payload) => service.stateGet(payload || {}));
  ipcMain.handle('totals:now', (_, payload) => service.totalsNow(payload || {}));
  ipcMain.handle('logs:list', (_, payload) => service.logsList(payload || {}));
  ipcMain.handle('finance:preview', (_, payload) => service.financePreview(payload || {}));
  ipcMain.handle('dashboards:getStats', (_, payload) => service.dashboardGetStats(payload || {}));
  ipcMain.handle('daily:finalize', (_, payload) => service.dailyFinalize(payload || {}));

  ipcMain.handle('barcodeMappings:list', () => service.barcodeMappingsList());
  ipcMain.handle('barcodeMappings:add', (_, payload) => service.barcodeMappingsAdd(payload));
  ipcMain.handle('barcodeMappings:delete', (_, payload) => service.barcodeMappingsDelete(payload));

  ipcMain.handle('cv:analyze', async (_, fruit) => {
    let registeredBoxes = [];
    try {
      const dbBoxes = await service.boxWeightsList();
      registeredBoxes = (dbBoxes || [])
        .filter(b => Number(b.active) === 1)
        .map(b => ({
          name: b.name,
          weight_kg: Number(b.weight_kg || 0)
        }));
    } catch (err) {
      console.error('[main.js] Error loading box weights from DB:', err.message);
    }
    return await analyzeBox(fruit, registeredBoxes);
  });


  ipcMain.handle('cv:installDependencies', async () => {
    const { exec } = require('child_process');
    const fs = require('fs');
    if (process.platform === 'win32') {
      const batPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'setup_windows.bat')
        : path.join(__dirname, '..', 'setup_windows.bat');
        
      if (fs.existsSync(batPath)) {
        console.log('[main.js] Executing setup_windows.bat with /k:', batPath);
        exec(`cmd.exe /c start cmd.exe /k "${batPath}"`);
        return { ok: true, message: 'Instalador de dependências iniciado em uma nova janela do CMD.' };
      } else {
        exec('cmd.exe /c start cmd.exe /k "py -3 -m pip install --user --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests || python -m pip install --user --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests"');
        return { ok: true, message: 'Instalação via terminal iniciada em nova janela.' };
      }
    } else {
      exec('python3 -m pip install --user opencv-python-headless numpy flask flask-cors pytesseract requests');
      return { ok: true, message: 'Instalação via pip3 iniciada.' };
    }
  });

  ipcMain.handle('sync:now', async () => {
    await syncToSupabase(db);
    await syncFromSupabase(db);
    return { ok: true };
  });

  ipcMain.handle('file:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    });

    if (result.canceled || !result.filePaths.length) {
      return { ok: false, path: '' };
    }

    return { ok: true, path: result.filePaths[0] };
  });

  ipcMain.handle('update:restartAndInstall', () => {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.quitAndInstall();
    } catch (e) {
      console.error('Error in quitAndInstall:', e.message);
    }
  });

  ipcMain.handle('update:check', async () => {
    try {
      const { autoUpdater } = require('electron-updater');
      const res = await autoUpdater.checkForUpdates();
      return { ok: true, updateInfo: res ? res.updateInfo : null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

app.whenReady().then(() => {
  try {
    db = initDb();
    console.log('App: DB initialized.');
    service = createAppService(db);
    console.log('App: Service created.');
  } catch (err) {
    console.error('App: Error initializing local database:', err);
    dialog.showErrorBox('Erro ao inicializar o banco de dados local', 'Ocorreu um erro ao carregar a base de dados: ' + err.message);
  }

  try {
    registerIpc();
  } catch (err) {
    console.error('App: Error registering IPC handlers:', err);
  }

  try {
    createWindow();
  } catch (err) {
    console.error('App: Error creating main window:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Background sync every 20 seconds
  setInterval(() => {
    syncToSupabase(db).catch(console.error);
    syncFromSupabase(db).catch(console.error);
  }, 20000);

  // Expose global forceSync for other services
  global.forceSync = async () => {
    await syncToSupabase(db);
    await syncFromSupabase(db);
  };

  // Immediate sync on startup
  setTimeout(() => global.forceSync().catch(console.error), 10000);

  // Configuração do Auto-Updater (Atualização Automática)
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      console.log('App: Auto-update available:', info.version);
      if (mainWindow) mainWindow.webContents.send('update:status', { status: 'available', version: info.version });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('App: Auto-update downloaded:', info.version);
      if (mainWindow) mainWindow.webContents.send('update:status', { status: 'downloaded', version: info.version });
    });

    autoUpdater.on('error', (err) => {
      console.log('App: Auto-updater info/error:', err.message);
    });

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('Auto-update check:', err.message));
    }, 12000);

    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('Auto-update check:', err.message));
    }, 3 * 60 * 60 * 1000);
  } catch (e) {
    console.log('App: Auto-updater skipped in dev mode:', e.message);
  }

  // Start CV Service (Python)
  try {
    const { spawn, exec } = require('child_process');
    const fs = require('fs');
    const pyPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'cv_service.py')
      : path.join(__dirname, '..', 'cv_service.py');
    
    function findPythonExecutable() {
      // ── Prioridade 1: Python embutido (bundled runtime) — Windows empacotado ──
      if (app.isPackaged && process.platform === 'win32') {
        const bundledPython = path.join(process.resourcesPath, 'python-runtime', 'python.exe');
        if (fs.existsSync(bundledPython)) {
          console.log('App: Using bundled Python runtime:', bundledPython);
          return bundledPython;
        }
      }
      
      const startDirs = [
        __dirname,
        app.getAppPath(),
        process.resourcesPath,
        process.cwd()
      ];
      
      for (const startDir of startDirs) {
        if (!startDir) continue;
        let currentDir = startDir;
        while (currentDir) {
          const venvSysPath = path.join(currentDir, '.venv_sys', 'bin', 'python3');
          const venvPath = path.join(currentDir, '.venv', 'bin', 'python3');
          const venvSysWin = path.join(currentDir, '.venv_sys', 'Scripts', 'python.exe');
          const venvWin = path.join(currentDir, '.venv', 'Scripts', 'python.exe');
          const venvWinNoDot = path.join(currentDir, 'venv', 'Scripts', 'python.exe');
          const venvNoDot = path.join(currentDir, 'venv', 'bin', 'python3');
          
          if (fs.existsSync(venvWinNoDot)) return venvWinNoDot;
          if (fs.existsSync(venvWin)) return venvWin;
          if (fs.existsSync(venvSysWin)) return venvSysWin;
          if (fs.existsSync(venvNoDot)) return venvNoDot;
          if (fs.existsSync(venvPath)) return venvPath;
          if (fs.existsSync(venvSysPath)) return venvSysPath;
          
          const parentDir = path.dirname(currentDir);
          if (parentDir === currentDir) break;
          currentDir = parentDir;
        }
      }
      
      // Busca em caminhos padrão de instalação do Python no Windows
      if (process.platform === 'win32') {
        const sysRoot = process.env.SystemRoot || 'C:\\Windows';
        const winPyPaths = [
          path.join(sysRoot, 'py.exe'),
          path.join(sysRoot, 'System32', 'py.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python39', 'python.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'python.exe'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Python311', 'python.exe'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Python312', 'python.exe'),
          'C:\\Python311\\python.exe',
          'C:\\Python312\\python.exe',
          'C:\\Python310\\python.exe'
        ];
        for (const p of winPyPaths) {
          if (fs.existsSync(p)) return p;
        }
      }
      
      return process.platform === 'win32' ? 'python' : 'python3';
    }

    let pyExec = 'python';
    try {
      pyExec = findPythonExecutable() || (process.platform === 'win32' ? 'python' : 'python3');
    } catch (e) {
      console.error('App: Error finding Python executable:', e.message);
    }

    const pyDir = path.dirname(pyPath);
    const pyArgs = (typeof pyExec === 'string' && (pyExec.endsWith('py.exe') || pyExec === 'py')) ? ['-3', '-u', pyPath] : ['-u', pyPath];
    
    console.log('App: Starting CV Service using', pyExec, 'with args:', pyArgs, 'at', pyPath, 'CWD:', pyDir);
    
    function triggerAutoSetupWin() {
      if (process.platform === 'win32') {
        const batPath = app.isPackaged 
          ? path.join(process.resourcesPath, 'setup_windows.bat')
          : path.join(__dirname, '..', 'setup_windows.bat');
        if (fs.existsSync(batPath)) {
          console.log('App: Automatically triggering setup_windows.bat due to Python/CV error...');
          exec(`cmd.exe /c start cmd.exe /k "${batPath}"`);
        }
      }
    }

    // Usamos '-u' para Python unbuffered stdout/stderr
    const pyProcess = spawn(pyExec, pyArgs, { cwd: pyDir });

    pyProcess.stdout.on('data', (data) => console.log(`CV: ${data}`));
    pyProcess.stderr.on('data', (data) => {
      const errStr = data.toString();
      console.error(`CV Error: ${errStr}`);
      if (errStr.includes('ModuleNotFoundError') || errStr.includes('No module named')) {
        triggerAutoSetupWin();
      }
    });
    
    pyProcess.on('error', (err) => {
      console.error('CV Process: Failed to spawn child process:', err);
      triggerAutoSetupWin();
    });

    pyProcess.on('exit', (code, signal) => {
      console.log(`CV Process: Exited with code ${code} and signal ${signal}`);
      if (code !== 0 && code !== null) {
        triggerAutoSetupWin();
      }
    });

    pyProcess.on('close', (code, signal) => {
      console.log(`CV Process: Connection closed with code ${code} and signal ${signal}`);
    });
    
    app.on('will-quit', () => {
      console.log('App: Killing CV Service...');
      try { pyProcess.kill(); } catch (e) {}
    });
  } catch (err) {
    console.error('App: Exception starting CV Service:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  configGetAll: () => ipcRenderer.invoke('config:getAll'),
  configSet: (payload) => ipcRenderer.invoke('config:set', payload),
  authLogin: (payload) => ipcRenderer.invoke('auth:login', payload),
  authCheck: () => ipcRenderer.invoke('auth:check'),
  dbReset: () => ipcRenderer.invoke('db:reset'),

  
  employeesList: () => ipcRenderer.invoke('employees:list'),
  employeesAdd: (payload) => ipcRenderer.invoke('employees:add', payload),
  employeesUpdate: (payload) => ipcRenderer.invoke('employees:update', payload),
  employeesDelete: (payload) => ipcRenderer.invoke('employees:delete', payload),

  fruitsList: () => ipcRenderer.invoke('fruits:list'),
  fruitsAdd: (payload) => ipcRenderer.invoke('fruits:add', payload),
  fruitsUpdate: (payload) => ipcRenderer.invoke('fruits:update', payload),
  fruitsDelete: (payload) => ipcRenderer.invoke('fruits:delete', payload),

  varietiesList: () => ipcRenderer.invoke('varieties:list'),
  varietiesAdd: (payload) => ipcRenderer.invoke('varieties:add', payload),
  varietiesUpdate: (payload) => ipcRenderer.invoke('varieties:update', payload),
  varietiesDelete: (payload) => ipcRenderer.invoke('varieties:delete', payload),

  parcelsList: () => ipcRenderer.invoke('parcels:list'),
  parcelsAdd: (payload) => ipcRenderer.invoke('parcels:add', payload),
  parcelsUpdate: (payload) => ipcRenderer.invoke('parcels:update', payload),
  parcelsDelete: (payload) => ipcRenderer.invoke('parcels:delete', payload),

  boxWeightsList: () => ipcRenderer.invoke('boxWeights:list'),
  boxWeightsAdd: (payload) => ipcRenderer.invoke('boxWeights:add', payload),
  boxWeightsUpdate: (payload) => ipcRenderer.invoke('boxWeights:update', payload),
  boxWeightsDelete: (payload) => ipcRenderer.invoke('boxWeights:delete', payload),

  parcelPairsList: (payload) => ipcRenderer.invoke('parcelPairs:list', payload),
  parcelPairsAdd: (payload) => ipcRenderer.invoke('parcelPairs:add', payload),
  parcelPairsRemove: (payload) => ipcRenderer.invoke('parcelPairs:remove', payload),

  parcelFruitsList: (payload) => ipcRenderer.invoke('parcelFruits:list', payload),
  parcelVarietiesList: (payload) => ipcRenderer.invoke('parcelVarieties:list', payload),

  contextGet: (payload) => ipcRenderer.invoke('context:get', payload),
  contextSet: (payload) => ipcRenderer.invoke('context:set', payload),

  scanSubmit: (payload) => ipcRenderer.invoke('scan:submit', payload),
  stateGet: (payload) => ipcRenderer.invoke('state:get', payload),
  totalsNow: (payload) => ipcRenderer.invoke('totals:now', payload),
  logsList: (payload) => ipcRenderer.invoke('logs:list', payload),
  dashboardsGetStats: (payload) => ipcRenderer.invoke('dashboards:getStats', payload),
  cvAnalyze: (fruit) => ipcRenderer.invoke('cv:analyze', fruit),
  cvInstallDependencies: () => ipcRenderer.invoke('cv:installDependencies'),
  dailyFinalize: (payload) => ipcRenderer.invoke('daily:finalize', payload),
  financePreview: (payload) => ipcRenderer.invoke('finance:preview', payload),

  barcodeMappingsList: () => ipcRenderer.invoke('barcodeMappings:list'),
  barcodeMappingsAdd: (payload) => ipcRenderer.invoke('barcodeMappings:add', payload),
  barcodeMappingsDelete: (payload) => ipcRenderer.invoke('barcodeMappings:delete', payload),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  onSyncAuthError: (callback) => ipcRenderer.on('sync:auth-error', (_, data) => callback(data)),
  onUpdateStatus: (callback) => ipcRenderer.on('update:status', (_, data) => callback(data)),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateRestartAndInstall: () => ipcRenderer.invoke('update:restartAndInstall')
});

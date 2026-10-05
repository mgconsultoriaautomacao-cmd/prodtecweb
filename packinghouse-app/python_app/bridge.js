/**
 * bridge.js — Polyfill do QWebChannel para window.api
 * Permite que a UI do Electron (renderer.js) rode no PyQt6 QWebEngineView sem alterações.
 */
(function() {
  const listeners = {};

  window.__pyPushEvent = function(eventName, payload) {
    const list = listeners[eventName] || [];
    list.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[Bridge] Erro no listener do evento ${eventName}:`, err);
      }
    });
  };

  function addEventListener(eventName, callback) {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(callback);
  }

  let pyapiReadyPromise = new Promise((resolve) => {
    function initChannel() {
      if (typeof QWebChannel !== 'undefined' && typeof qt !== 'undefined' && qt.webChannelTransport) {
        new QWebChannel(qt.webChannelTransport, function(channel) {
          window.pyapi = channel.objects.pyapi;
          console.log('[Bridge] QWebChannel conectado com sucesso ao Python backend.');
          resolve(window.pyapi);
        });
      } else {
        setTimeout(initChannel, 10);
      }
    }
    initChannel();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChannel);
    }
  });

  function callApi(methodName, payload) {
    return new Promise(async (resolve, reject) => {
      try {
        const api = window.pyapi || await pyapiReadyPromise;
        if (!api || typeof api[methodName] !== 'function') {
          console.error(`[Bridge] Método não encontrado no Python: ${methodName}`);
          return reject(new Error(`Método da API '${methodName}' não encontrado no Python backend.`));
        }
        
        const callback = (resStr) => {
          try {
            const data = JSON.parse(resStr || '{}');
            resolve(data);
          } catch (e) {
            resolve(resStr);
          }
        };

        if (payload !== undefined) {
          const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
          api[methodName](payloadStr, callback);
        } else {
          api[methodName](callback);
        }
      } catch (err) {
        console.error(`[Bridge] Erro ao chamar ${methodName}:`, err);
        reject(err);
      }
    });
  }

  window.api = {
    configGetAll: () => callApi('configGetAll'),
    configSet: (p) => callApi('configSet', p),
    authLogin: (p) => callApi('authLogin', p),
    authCheck: () => callApi('authCheck'),
    dbReset: () => callApi('dbReset'),

    employeesList: () => callApi('employeesList'),
    employeesAdd: (p) => callApi('employeesAdd', p),
    employeesUpdate: (p) => callApi('employeesUpdate', p),
    employeesDelete: (p) => callApi('employeesDelete', p),

    fruitsList: () => callApi('fruitsList'),
    fruitsAdd: (p) => callApi('fruitsAdd', p),
    fruitsUpdate: (p) => callApi('fruitsUpdate', p),
    fruitsDelete: (p) => callApi('fruitsDelete', p),

    varietiesList: () => callApi('varietiesList'),
    varietiesAdd: (p) => callApi('varietiesAdd', p),
    varietiesUpdate: (p) => callApi('varietiesUpdate', p),
    varietiesDelete: (p) => callApi('varietiesDelete', p),

    parcelsList: () => callApi('parcelsList'),
    parcelsAdd: (p) => callApi('parcelsAdd', p),
    parcelsUpdate: (p) => callApi('parcelsUpdate', p),
    parcelsDelete: (p) => callApi('parcelsDelete', p),

    boxWeightsList: () => callApi('boxWeightsList'),
    boxWeightsAdd: (p) => callApi('boxWeightsAdd', p),
    boxWeightsUpdate: (p) => callApi('boxWeightsUpdate', p),
    boxWeightsDelete: (p) => callApi('boxWeightsDelete', p),

    parcelPairsList: (p) => callApi('parcelPairsList', p),
    parcelPairsAdd: (p) => callApi('parcelPairsAdd', p),
    parcelPairsRemove: (p) => callApi('parcelPairsRemove', p),

    parcelFruitsList: (p) => callApi('parcelFruitsList', p),
    parcelVarietiesList: (p) => callApi('parcelVarietiesList', p),

    contextGet: (p) => callApi('contextGet', p),
    contextSet: (p) => callApi('contextSet', p),

    scanSubmit: (p) => callApi('scanSubmit', p),
    stateGet: (p) => callApi('stateGet', p),
    totalsNow: (p) => callApi('totalsNow', p),
    logsList: (p) => callApi('logsList', p),
    dashboardsGetStats: (p) => callApi('dashboardsGetStats', p),
    cvAnalyze: (fruit) => callApi('cvAnalyze', fruit),
    cvInstallDependencies: () => callApi('cvInstallDependencies'),
    dailyFinalize: (p) => callApi('dailyFinalize', p),
    financePreview: (p) => callApi('financePreview', p),

    barcodeMappingsList: () => callApi('barcodeMappingsList'),
    barcodeMappingsAdd: (p) => callApi('barcodeMappingsAdd', p),
    barcodeMappingsDelete: (p) => callApi('barcodeMappingsDelete', p),
    syncNow: () => callApi('syncNow'),
    pickImage: () => callApi('pickImage'),

    onSyncAuthError: (cb) => addEventListener('sync:auth-error', cb),
    onSyncStatus: (cb) => addEventListener('sync:status', cb),
    onUpdateStatus: (cb) => addEventListener('update:status', cb),
    updateCheck: () => callApi('updateCheck'),
    updateRestartAndInstall: () => callApi('updateRestartAndInstall')
  };
})();

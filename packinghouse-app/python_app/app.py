"""
app.py — Ponto de entrada principal do PRODTEC Packinghouse (versão Python/PyQt6)
Substitui: src/main.js + src/preload.js do Electron

A UI HTML/CSS/JS existente (src/renderer/) é reutilizada intacta dentro do QWebEngineView.
A comunicação JS↔Python acontece via QWebChannel (substitui o ipcMain/ipcRenderer do Electron).
"""
import sys
import os
import json
import threading
import time
import subprocess
from pathlib import Path

# ── Adiciona o diretório python_app ao path para imports ─────────────────────
_THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_THIS_DIR))

from PyQt6.QtWidgets import QApplication, QMainWindow, QFileDialog, QMessageBox
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtCore import QObject, pyqtSlot, QUrl, QTimer, pyqtSignal
from PyQt6.QtGui import QIcon

# Importa camadas locais
import db_python
import app_service
import sync_service

# ─── Caminhos ────────────────────────────────────────────────────────────────
_APP_DIR      = _THIS_DIR.parent                          # packinghouse-app/
_RENDERER_DIR = _APP_DIR / 'src' / 'renderer'
_CV_SERVICE   = _APP_DIR / 'cv_service.py'
_INDEX_HTML   = _RENDERER_DIR / 'index.html'

APP_VERSION = '1.0.7-py'


# ═══════════════════════════════════════════════════════════════════════════════
# Bridge — exposta ao JavaScript via window.api.*
# Espelha exatamente os métodos do preload.js do Electron
# ═══════════════════════════════════════════════════════════════════════════════
# Sessão HTTP reutilizada (keep-alive) para o cv_service. Usa 127.0.0.1 em vez de
# 'localhost': no Windows o 'localhost' tenta IPv6 (::1) primeiro e, como o Flask
# escuta só em IPv4, cada chamada perdia ~1-2s até cair para 127.0.0.1.
_cv_session = None

def _cv_http():
    global _cv_session
    if _cv_session is None:
        import requests
        _cv_session = requests.Session()
    return _cv_session


class ApiChannel(QObject):
    """
    Cada método marcado com @pyqtSlot é acessível do JavaScript como:
      window.pyapi.methodName(args, callback)
    O wrapper JS (bridge.js) converte isso para a mesma interface do preload.js:
      window.api.methodName(args) → Promise
    """
    # Sinal para enviar mensagens push para o renderer (substitui ipcRenderer.on)
    pushEvent = pyqtSignal(str, str)  # (eventName, jsonPayload)

    def __init__(self, parent=None, force_sync_fn=None):
        super().__init__(parent)
        self._force_sync_fn = force_sync_fn

    def _ok(self, data) -> str:
        return json.dumps(data, ensure_ascii=False, default=str)

    # ── Config ────────────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def configGetAll(self):
        return self._ok(app_service.config_get_all())

    @pyqtSlot(str, result=str)
    def configSet(self, payload_json: str):
        return self._ok(app_service.config_set(json.loads(payload_json or '{}')))

    # ── Auth ──────────────────────────────────────────────────────────────────
    @pyqtSlot(str, result=str)
    def authLogin(self, payload_json: str):
        p = json.loads(payload_json or '{}')
        return self._ok(app_service.auth_login(p.get('email', ''), p.get('password', '')))

    @pyqtSlot(result=str)
    def authCheck(self):
        return self._ok(app_service.auth_check())

    @pyqtSlot(result=str)
    def dbReset(self):
        return self._ok(app_service.db_reset())

    # ── Funcionários ──────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def employeesList(self):
        return self._ok(app_service.employees_list())

    @pyqtSlot(str, result=str)
    def employeesAdd(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.employees_add(d.get('barcode'), d.get('name'), d.get('role'), d.get('photo_path')))

    @pyqtSlot(str, result=str)
    def employeesUpdate(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.employees_update(d.get('id'), d.get('barcode'), d.get('name'), d.get('role'), d.get('photo_path'), d.get('active', 1)))

    @pyqtSlot(str, result=str)
    def employeesDelete(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.employees_delete(d.get('id')))

    # ── Frutas ────────────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def fruitsList(self):
        return self._ok(app_service.fruits_list())

    @pyqtSlot(str, result=str)
    def fruitsAdd(self, p: str):
        return self._ok(app_service.fruits_add(json.loads(p or '{}').get('name')))

    @pyqtSlot(str, result=str)
    def fruitsUpdate(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.fruits_update(d.get('id'), d.get('name'), d.get('active', 1)))

    @pyqtSlot(str, result=str)
    def fruitsDelete(self, p: str):
        return self._ok(app_service.fruits_delete(json.loads(p or '{}').get('id')))

    # ── Variedades ────────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def varietiesList(self):
        return self._ok(app_service.varieties_list())

    @pyqtSlot(str, result=str)
    def varietiesAdd(self, p: str):
        return self._ok(app_service.varieties_add(json.loads(p or '{}').get('name')))

    @pyqtSlot(str, result=str)
    def varietiesUpdate(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.varieties_update(d.get('id'), d.get('name'), d.get('active', 1)))

    @pyqtSlot(str, result=str)
    def varietiesDelete(self, p: str):
        return self._ok(app_service.varieties_delete(json.loads(p or '{}').get('id')))

    # ── Parcelas ──────────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def parcelsList(self):
        return self._ok(app_service.parcels_list())

    @pyqtSlot(str, result=str)
    def parcelsAdd(self, p: str):
        return self._ok(app_service.parcels_add(json.loads(p or '{}').get('code')))

    @pyqtSlot(str, result=str)
    def parcelsUpdate(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.parcels_update(d.get('id'), d.get('code'), d.get('active', 1)))

    @pyqtSlot(str, result=str)
    def parcelsDelete(self, p: str):
        return self._ok(app_service.parcels_delete(json.loads(p or '{}').get('id')))

    @pyqtSlot(str, result=str)
    def parcelPairsList(self, p: str):
        return self._ok(app_service.parcel_pairs_list(json.loads(p or '{}').get('parcelId')))

    @pyqtSlot(str, result=str)
    def parcelPairsAdd(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.parcel_pair_add(d.get('parcelId'), d.get('fruitId'), d.get('varietyId')))

    @pyqtSlot(str, result=str)
    def parcelPairsRemove(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.parcel_pair_remove(d.get('parcelId'), d.get('fruitId'), d.get('varietyId')))

    @pyqtSlot(str, result=str)
    def parcelFruitsList(self, p: str):
        return self._ok(app_service.parcel_fruits_list(json.loads(p or '{}').get('parcelId')))

    @pyqtSlot(str, result=str)
    def parcelVarietiesList(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.parcel_varieties_list(d.get('parcelId'), d.get('fruitId')))

    # ── Pesos de Caixa ────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def boxWeightsList(self):
        return self._ok(app_service.box_weights_list())

    @pyqtSlot(str, result=str)
    def boxWeightsAdd(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.box_weights_add(d.get('name'), d.get('weight_kg', 0)))

    @pyqtSlot(str, result=str)
    def boxWeightsUpdate(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.box_weights_update(d.get('id'), d.get('name'), d.get('weight_kg', 0), d.get('active', 1)))

    @pyqtSlot(str, result=str)
    def boxWeightsDelete(self, p: str):
        return self._ok(app_service.box_weights_delete(json.loads(p or '{}').get('id')))

    # ── Barcode Mappings ──────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def barcodeMappingsList(self):
        return self._ok(app_service.barcode_mappings_list())

    @pyqtSlot(str, result=str)
    def barcodeMappingsAdd(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.barcode_mappings_add(d.get('barcode'), d.get('employeeId'), d.get('weightId')))

    @pyqtSlot(str, result=str)
    def barcodeMappingsDelete(self, p: str):
        return self._ok(app_service.barcode_mappings_delete(json.loads(p or '{}').get('barcode')))

    # ── Contexto ──────────────────────────────────────────────────────────────
    @pyqtSlot(str, result=str)
    def contextGet(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.context_get(d.get('stationId', 'ST01'), d.get('role', 'EMBALADOR')))

    @pyqtSlot(str, result=str)
    def contextSet(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.context_set(
            d.get('stationId', 'ST01'), d.get('role', 'EMBALADOR'),
            d.get('parcelId'), d.get('fruitId'), d.get('varietyId'), d.get('weightId')
        ))

    # ── Scan & Stats ──────────────────────────────────────────────────────────
    @pyqtSlot(str, result=str)
    def scanSubmit(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.scan_submit(
            d.get('stationId', 'ST01'), d.get('scannerId', 'SC01'), d.get('role', 'EMBALADOR'),
            d.get('rawBarcode', ''), d.get('caliber'), d.get('cvBoxModel'), d.get('cvWeight'),
            d.get('cvUnidentified', False)
        ))

    @pyqtSlot(str, result=str)
    def stateGet(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.state_get(d.get('stationId', 'ST01'), d.get('role', 'EMBALADOR')))

    @pyqtSlot(str, result=str)
    def totalsNow(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.totals_now(d.get('stationId', 'ST01'), d.get('role', 'EMBALADOR')))

    @pyqtSlot(str, result=str)
    def logsList(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.logs_list(d.get('startMs'), d.get('endMs'), d.get('stationId', 'ST01'), d.get('role'), d.get('limit', 500)))

    @pyqtSlot(str, result=str)
    def financePreview(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.finance_preview(d.get('startMs', 0), d.get('endMs', 0), d.get('role', 'EMBALADOR')))

    @pyqtSlot(str, result=str)
    def dashboardsGetStats(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.dashboard_get_stats(
            d.get('stationId', 'ST01'), d.get('startMs', 0), d.get('endMs', 0), d.get('employeeId')
        ))

    @pyqtSlot(str, result=str)
    def dailyFinalize(self, p: str):
        d = json.loads(p or '{}')
        return self._ok(app_service.daily_finalize(d.get('stationId', 'ST01'), d.get('date'), self._force_sync_fn))

    # ── Sync ──────────────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def syncNow(self):
        try:
            if self._force_sync_fn:
                self._force_sync_fn()
            return self._ok({'ok': True})
        except Exception as e:
            return self._ok({'ok': False, 'error': str(e)})

    # ── Visão Computacional ───────────────────────────────────────────────────
    @pyqtSlot(str, result=str)
    def cvAnalyze(self, fruit: str):
        """Delega para o cv_service.py via HTTP (porta 5000 /analyze)."""
        try:
            boxes = app_service.box_weights_list()
            registered_boxes = [{'name': b['name'], 'weight_kg': float(b['weight_kg'] or 0)} for b in boxes if b.get('active')]
            payload = {
                'fruit': fruit or '',
                'registered_boxes': registered_boxes
            }
            res = _cv_http().post('http://127.0.0.1:5000/analyze', json=payload, timeout=(0.3, 1.2))
            if res.ok:
                data = res.json()
                return self._ok({
                    'ok': data.get('ok', True),
                    'caliber': data.get('caliber', 'NÃO IDENTIF.'),
                    'count': data.get('count', 0),
                    'confidence': data.get('confidence', 0.0),
                    'box_model': data.get('box_model', 'NÃO IDENTIF.'),
                    'detected_weight': data.get('detected_weight', 0),
                    'validation': data.get('validation'),
                    'min_fruit_kg': data.get('min_fruit_kg'),
                    'expected_min_kg': data.get('expected_min_kg'),
                    'warnings': data.get('warnings', []),
                    'dual_mode': data.get('dual_mode', False),
                    'analyze_ms': data.get('analyze_ms'),
                    'status': 'success'
                })
            else:
                return self._ok({
                    'ok': False,
                    'caliber': 'FALHA_IA',
                    'count': 0,
                    'confidence': 0.0,
                    'box_model': 'NÃO IDENTIF.',
                    'detected_weight': 0,
                    'status': 'error'
                })
        except Exception as e:
            return self._ok({
                'ok': False,
                'caliber': 'ERRO_CONEXAO',
                'count': 0,
                'confidence': 0.0,
                'box_model': 'NÃO IDENTIF.',
                'detected_weight': 0,
                'status': 'error'
            })

    @pyqtSlot(result=str)
    def cvInstallDependencies(self):
        try:
            if sys.platform == 'win32':
                subprocess.Popen(['cmd.exe', '/c', 'start', 'cmd.exe', '/k',
                    'py -3 -m pip install --user opencv-python-headless numpy flask flask-cors pytesseract requests'],
                    shell=True)
            else:
                subprocess.Popen(['python3', '-m', 'pip', 'install', '--user',
                    'opencv-python-headless', 'numpy', 'flask', 'flask-cors', 'pytesseract', 'requests'])
            return self._ok({'ok': True, 'message': 'Instalação iniciada.'})
        except Exception as e:
            return self._ok({'ok': False, 'error': str(e)})

    # ── File Picker ───────────────────────────────────────────────────────────
    @pyqtSlot(result=str)
    def pickImage(self):
        path, _ = QFileDialog.getOpenFileName(
            None, 'Selecionar Imagem', '',
            'Imagens (*.png *.jpg *.jpeg *.webp)'
        )
        if path:
            return self._ok({'ok': True, 'path': path})
        return self._ok({'ok': False, 'path': ''})

    # ── Update (stub — sem electron-updater) ──────────────────────────────────
    @pyqtSlot(result=str)
    def updateCheck(self):
        return self._ok({'ok': True, 'updateInfo': None})

    @pyqtSlot(result=str)
    def updateRestartAndInstall(self):
        return self._ok({'ok': False, 'error': 'Not implemented in Python version'})


class ConsolePage(QWebEnginePage):
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceId):
        src = sourceId.split('/')[-1] if sourceId else 'inline'
        print(f'[JS:{src}:{lineNumber}] {message}')


# ═══════════════════════════════════════════════════════════════════════════════
# Janela Principal
# ═══════════════════════════════════════════════════════════════════════════════
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f'PRODTEC Packinghouse v{APP_VERSION}')
        self.setMinimumSize(1200, 760)
        self.resize(1400, 900)
        self.setStyleSheet('background: #0f172a;')

        # Ícone da aplicação (usa o mesmo do Electron se existir)
        icon_path = _APP_DIR / 'assets' / 'icon.ico'
        if icon_path.exists():
            self.setWindowIcon(QIcon(str(icon_path)))

        # Web view com console integrado
        self._view = QWebEngineView(self)
        self._page = ConsolePage(self)
        
        # Configurações de segurança + permissões na página ativa
        settings = self._page.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowWindowActivationFromJavaScript, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowRunningInsecureContent, True)
        
        self._view.setPage(self._page)
        self.setCentralWidget(self._view)

        # ── Inicializa DB ──────────────────────────────────────────────────────
        print('App: Inicializando banco de dados...')
        db_python.init_db()
        print('App: Banco de dados inicializado.')

        # ── Sync ──────────────────────────────────────────────────────────────
        self._is_syncing = False
        self._closing = False
        self._backoff = 20_000
        self._sync_thread = None

        # ── Bridge QWebChannel ────────────────────────────────────────────────
        self._channel = QWebChannel(self._page)
        self._api = ApiChannel(force_sync_fn=self._trigger_sync)
        self._api.pushEvent.connect(self._on_push_event)
        self._channel.registerObject('pyapi', self._api)
        self._page.setWebChannel(self._channel)

        # ── Carrega a UI existente ────────────────────────────────────────────
        html_url = QUrl.fromLocalFile(str(_INDEX_HTML))
        self._view.load(html_url)
        print(f'App: Carregando {_INDEX_HTML}')

        # ── Callback após carregamento ────────────────────────────────────────
        self._view.loadFinished.connect(self._on_load_finished)

    def _inject_bridge_scripts(self):
        pass

    def _on_load_finished(self, ok: bool):
        if ok:
            print('App: UI carregada com sucesso.')
            # Inicia worker de sincronização em background
            self._start_sync_worker()
            # Inicia serviço de visão computacional
            self._start_cv_service()
        else:
            print('App: ERRO ao carregar UI.')

    def _on_push_event(self, event_name: str, payload: str):
        """Envia eventos push do Python → JavaScript (substitui ipcRenderer.on)."""
        js = f"window.__pyPushEvent && window.__pyPushEvent({json.dumps(event_name)}, {payload});"
        self._view.page().runJavaScript(js)

    # ── Sincronização ─────────────────────────────────────────────────────────
    def _start_sync_worker(self):
        if self._sync_thread is None or not self._sync_thread.is_alive():
            self._sync_thread = threading.Thread(target=self._sync_worker_loop, daemon=True)
            self._sync_thread.start()

    def _sync_worker_loop(self):
        time.sleep(5)  # Espera inicial para UI inicializar
        while not self._closing:
            self._run_sync_cycle()
            wait_seconds = max(5, int(self._backoff / 1000))
            for _ in range(wait_seconds):
                if self._closing:
                    break
                time.sleep(1)

    def _trigger_sync(self):
        threading.Thread(target=self._run_sync_cycle, daemon=True).start()

    def _run_sync_cycle(self):
        if self._is_syncing or self._closing:
            return
        self._is_syncing = True
        self._api.pushEvent.emit('sync:status', json.dumps({'state': 'syncing'}))
        try:
            conn = db_python.get_db()
            sync_service.sync_to_supabase(conn)
            sync_service.sync_from_supabase(conn, on_auth_error=self._on_sync_auth_error)
            self._backoff = 20_000
            self._api.pushEvent.emit('sync:status', json.dumps({'state': 'synced', 'lastSync': db_python.now_ms()}))
        except Exception as e:
            print(f'Sync: Falha no ciclo: {e}')
            self._backoff = min(self._backoff * 2, 120_000)
            self._api.pushEvent.emit('sync:status', json.dumps({'state': 'offline', 'error': str(e), 'nextRetry': self._backoff}))
        finally:
            self._is_syncing = False

    def _on_sync_auth_error(self, status: int, body: str):
        self._api.pushEvent.emit('sync:auth-error', json.dumps({'status': status, 'body': body}))

    # ── Serviço de Visão Computacional ────────────────────────────────────────
    _py_process = None

    def _start_cv_service(self):
        if not _CV_SERVICE.exists():
            print(f'App: cv_service.py não encontrado em {_CV_SERVICE}')
            return
        try:
            py_exe = sys.executable
            print(f'App: Iniciando CV Service com {py_exe} {_CV_SERVICE}')
            self._py_process = subprocess.Popen(
                [py_exe, '-u', str(_CV_SERVICE)],
                cwd=str(_CV_SERVICE.parent),
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT  # stderr precisa ser drenado, senão o processo trava
            )
            # Log em thread separada
            threading.Thread(target=self._log_cv_output, daemon=True).start()
        except Exception as e:
            print(f'App: Erro ao iniciar CV Service: {e}')

    def _log_cv_output(self):
        if not self._py_process:
            return
        for line in self._py_process.stdout:
            try:
                text = line.decode('utf-8', errors='replace').rstrip()
                # Remove emojis que o console Windows não suporta
                safe = text.encode(sys.stdout.encoding or 'cp1252', errors='replace').decode(sys.stdout.encoding or 'cp1252')
                print(f'CV: {safe}')
            except Exception:
                pass

    def closeEvent(self, event):
        self._closing = True
        if self._py_process:
            try:
                self._py_process.terminate()
                print('App: CV Service encerrado.')
            except Exception:
                pass
        event.accept()


# ═══════════════════════════════════════════════════════════════════════════════
# Ponto de entrada
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    # Compatibilidade com telas de alta resolução (DPI)
    os.environ.setdefault('QT_AUTO_SCREEN_SCALE_FACTOR', '1')

    app = QApplication(sys.argv)
    app.setApplicationName('PRODTEC Packinghouse')
    app.setApplicationVersion(APP_VERSION)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())

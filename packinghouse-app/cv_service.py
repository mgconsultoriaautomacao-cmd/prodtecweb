import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import threading
import time
import subprocess
import os
import sys
import re
import json
import logging
import unicodedata
from collections import deque, Counter

os.environ.setdefault("OPENCV_LOG_LEVEL", "SILENT")

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

try:
    if hasattr(cv2, 'setLogLevel'):
        cv2.setLogLevel(cv2.LOG_LEVEL_SILENT)
except Exception:
    pass

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', str(input_str))
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

# Tenta importar o pytesseract para suporte cross-platform (Windows, Raspberry Pi, macOS)
try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

app = Flask(__name__)
CORS(app) # Libera acesso para o Electron

current_count = 0
current_frame = None
lock = threading.Lock()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OCR_PATH = os.path.join(BASE_DIR, "scratch", "ocr")
TEMP_FRAME_PATH = os.path.join(BASE_DIR, "scratch", "current_frame.jpg")
CONFIG_PATH = os.path.join(BASE_DIR, "cv_config.json")

# ─── Tabelas de calibre por modelo de caixa ─────────────────────────────────────
# SIZE (calibre) = nº de frutas na caixa. "min_fruit_kg" = peso mínimo por fruta
# impresso na tabela da caixa (região 1 do mapeamento). "min_box_kg" = MIN. NET
# WEIGHT / BOX (região 2). A chave é procurada dentro do nome do modelo lido.
DEFAULT_BOX_SPECS = {
    "SAMBA": {
        "min_box_kg": 16.0,
        "min_fruit_kg": {"3": 6.00, "4": 4.50, "5": 3.60, "6": 2.70, "7": 2.05, "8": 1.80}
    }
}

# Configuração persistente (câmeras laterais, janela de análise, tabelas)
cv_config = {
    "side_camera": None,      # índice da câmera lateral (etiqueta) ou None
    "side2_camera": None,     # índice da câmera lateral oposta (opcional)
    "analyze_window_s": 0.6,  # quanto tempo "para trás" buscar o melhor frame no scan (0,5s–0,8s)
    "box_specs": DEFAULT_BOX_SPECS,
}

def load_cv_config():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cv_config.update(json.load(f) or {})
    except Exception as e:
        print(f"⚠️ Falha ao ler {CONFIG_PATH}: {e}")

def save_cv_config():
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cv_config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Falha ao salvar {CONFIG_PATH}: {e}")

# ─── ROI (Regiões de Interesse) ──────────────────────────────────────────────
# Coordenadas normalizadas (0.0 = topo/esquerda, 1.0 = baixo/direita) referentes
# ao frame completo. Padrão: ROI de frutas ocupa o terço superior central;
# ROI de etiqueta ocupa o terço inferior. O usuário pode ajustar pelo frontend.
#
# Formato: { "x": float, "y": float, "w": float, "h": float }  (valores 0..1)

roi_fruits = {"x": 0.05, "y": 0.02, "w": 0.90, "h": 0.60}  # área das frutas
roi_label  = {"x": 0.05, "y": 0.62, "w": 0.90, "h": 0.35}  # área da etiqueta/OCR
roi_enabled = True  # Se False, analisa o frame inteiro (comportamento legado)
# ─────────────────────────────────────────────────────────────────────────────

def is_frame_blurry(frame, threshold=70.0):
    """Retorna True se o frame estiver desfocado demais para OCR (motion blur)."""
    if frame is None:
        return True
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold

def crop_roi(frame, roi):
    """Recorta o frame de acordo com a ROI normalizada. Retorna o recorte e o offset (x0, y0)."""
    h, w = frame.shape[:2]
    x0 = int(roi["x"] * w)
    y0 = int(roi["y"] * h)
    x1 = min(w, x0 + int(roi["w"] * w))
    y1 = min(h, y0 + int(roi["h"] * h))
    return frame[y0:y1, x0:x1], (x0, y0)

# ─── Buffer circular de frames ───────────────────────────────────────────────
# A caixa passa pela câmera em 0,5–1s. Guardamos os frames recentes com nitidez
# para analisar a caixa que acabou de passar no instante do bipe.
frame_buffer = deque(maxlen=45)       # (timestamp, frame, nitidez)
ANALYZE_WINDOW_S = 0.6                # janela de busca do melhor frame no /analyze (0,6s)
OCR_TTL_SECONDS = 1.0                 # leitura de etiqueta expira em 1.0s (evita misturar caixas rápidas)
ocr_history = deque(maxlen=10)        # (timestamp, modelo, peso, pesos)
annotated_frame = None                # frame anotado exibido no visor por alguns instantes
annotated_until = 0.0
NI = "NÃO IDENTIF."

# Câmeras auxiliares (laterais) — cada uma com seu próprio buffer
aux_cams = {
    role: {"index": None, "frame": None, "buffer": deque(maxlen=90), "open": False}
    for role in ("side", "side2")
}

def aux_indices_in_use():
    return {c["index"] for c in aux_cams.values() if c["index"] is not None}

def frame_sharpness(frame):
    """Nitidez barata (variância do Laplaciano em versão reduzida)."""
    small = cv2.resize(frame, (320, 240))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())

def _source_buffer(source):
    if source == "top":
        return frame_buffer, current_frame
    cam = aux_cams[source]
    return cam["buffer"], cam["frame"]

def pick_best_frame(window_s=None, source="top"):
    """Retorna o frame mais nítido da câmera `source` dentro da janela recente."""
    if window_s is None:
        window_s = float(cv_config.get("analyze_window_s", ANALYZE_WINDOW_S))
    now = time.time()
    with lock:
        buf, fallback = _source_buffer(source)
        candidates = [c for c in buf if now - c[0] <= window_s]
    if not candidates:
        return fallback
    return max(candidates, key=lambda c: c[2])[1]

def dual_mode():
    """True quando há pelo menos uma câmera lateral ativa (etiqueta separada da contagem)."""
    return any(c["open"] for c in aux_cams.values())

def find_box_spec(box_model):
    name = remove_accents(str(box_model or "")).upper()
    for key, spec in (cv_config.get("box_specs") or {}).items():
        if remove_accents(key).upper() in name:
            return key, spec
    return None, None

def validate_caliber(count, box_model, detected_weight):
    """Cruza a contagem (câmera topo) com a tabela de calibres da caixa (câmera lateral)."""
    key, spec = find_box_spec(box_model)
    result = {"validation": "SEM_TABELA", "min_fruit_kg": None, "expected_min_kg": None,
              "allowed_calibers": [], "warnings": []}
    if not spec:
        return result
    table = spec.get("min_fruit_kg") or {}
    result["allowed_calibers"] = sorted(int(k) for k in table.keys())
    min_box = spec.get("min_box_kg")
    if detected_weight and min_box and abs(float(detected_weight) - float(min_box)) > 0.5:
        result["warnings"].append(f"PESO_DIVERGENTE: etiqueta {detected_weight}kg x tabela {min_box}kg")
    if not count:
        result["validation"] = "SEM_CONTAGEM"
        return result
    per_fruit = table.get(str(count))
    if per_fruit is None:
        result["validation"] = "VERIFICAR"
        result["warnings"].append(f"Calibre {count} fora da tabela {key} {result['allowed_calibers']}")
        return result
    result["validation"] = "OK"
    result["min_fruit_kg"] = float(per_fruit)
    result["expected_min_kg"] = round(count * float(per_fruit), 2)
    return result

def current_box_reading():
    """Votação por maioria entre leituras OCR recentes (evita valor velho de outra caixa)."""
    now = time.time()
    with lock:
        recent = [r for r in ocr_history if now - r[0] <= OCR_TTL_SECONDS]
    if not recent:
        return NI, 0, [], None
    model = Counter(r[1] for r in recent).most_common(1)[0][0]
    latest = max((r for r in recent if r[1] == model), key=lambda r: r[0])
    return model, latest[2], list(latest[3]), int((now - latest[0]) * 1000)

def is_solid_green_frame(frame):
    """Detecta tela verde sólida (câmera virtual / driver com erro)."""
    if frame is None:
        return False
    small = cv2.resize(frame, (64, 48)).astype(np.float32)
    b, g, r = small[:, :, 0].mean(), small[:, :, 1].mean(), small[:, :, 2].mean()
    return small.std() < 15 and g > 100 and g > r + 40 and g > b + 40

_tesseract_ready = None
TESS_CONFIG = "--oem 1 --psm 11"  # texto esparso (etiqueta de caixa tem blocos espalhados)
# Captura "16,0kg", "16.0 KG", "16 KG", "13KG"...
WEIGHT_RE = re.compile(r'(?<!\d)(\d{1,2})(?:\s*[.,]\s*\d{1,2})?\s*K\s*G')

def _ensure_tesseract():
    """Resolve o executável do Tesseract uma única vez (antes era a cada ciclo)."""
    global _tesseract_ready
    if _tesseract_ready is not None:
        return _tesseract_ready
    if not HAS_PYTESSERACT:
        _tesseract_ready = False
        return False
    if sys.platform == "win32":
        for p in [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Tesseract-OCR", "tesseract.exe"),
        ]:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                break
    _tesseract_ready = True
    return True

def preprocess_for_ocr(img):
    """Cinza + ampliação + binarização Otsu: Tesseract fica mais rápido e preciso."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    w = gray.shape[1]
    if 0 < w < 1200:
        s = 1200.0 / w
        gray = cv2.resize(gray, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(th) < 127:  # Tesseract prefere texto escuro em fundo claro
        th = cv2.bitwise_not(th)
    return th

def analyze_box_ocr(frame, registered_boxes=None, use_roi=None):
    output = ""
    used_engine = "NONE"

    # Aplica ROI de etiqueta antes do OCR (só no modo câmera única; a lateral usa o quadro todo)
    ocr_frame = frame
    if roi_enabled if use_roi is None else use_roi:
        ocr_frame, _ = crop_roi(frame, roi_label)

    # Verifica se o frame está nítido o suficiente para tentar OCR (evita motion blur)
    if is_frame_blurry(ocr_frame):
        return NI, 0, []

    # 1. Tenta usar o Pytesseract (Windows / Raspberry Pi / Mac com Tesseract instalado)
    if _ensure_tesseract():
        try:
            prepped = preprocess_for_ocr(ocr_frame)
            output = pytesseract.image_to_string(prepped, config=TESS_CONFIG, timeout=2)
            used_engine = "TESSERACT"
        except RuntimeError:
            print("⚠️ [OCR] Tesseract excedeu 2s. Ciclo descartado.")
        except Exception as e:
            print(f"⚠️ Pytesseract falhou (verifique se o executável do Tesseract-OCR está instalado): {e}")

    # 2. Se o Pytesseract falhar ou não estiver disponível, tenta o OCR nativo do Mac se estiver em macOS
    if not output.strip() and sys.platform == "darwin":
        if os.path.exists(OCR_PATH):
            os.makedirs(os.path.dirname(TEMP_FRAME_PATH), exist_ok=True)
            cv2.imwrite(TEMP_FRAME_PATH, ocr_frame)
            
            try:
                res = subprocess.run([OCR_PATH, TEMP_FRAME_PATH], capture_output=True, text=True, timeout=5.0)
                output = res.stdout
                used_engine = "MAC_VISION"
            except Exception as e:
                print(f"⚠️ Erro ao executar OCR nativo: {e}")

    # 3. Processa a saída para achar modelo/marca e peso com tolerância a ruído OCR
    # Procura por pesos explícitos (ex: "13KG", "15 KG", "16,0kg")
    # (antes output_upper/detected_weights não existiam -> NameError em TODO ciclo de OCR)
    output_upper = (output or "").upper()
    detected_weights = []
    for m in WEIGHT_RE.finditer(output_upper):
        w = int(m.group(1))
        if 3 <= w <= 30 and w not in detected_weights:
            detected_weights.append(w)
            
    detected_weight = detected_weights[0] if detected_weights else 0
    detected_model = "NÃO IDENTIF."

    # Mapeamento com tolerância a substituições comuns de OCR (ex: 4 -> A, 3 -> E, 0 -> O)
    clean_ocr = output_upper.replace('4', 'A').replace('3', 'E').replace('0', 'O').replace('1', 'I')
    normalized_output = remove_accents(clean_ocr)

    # Matching dinâmico com caixas cadastradas no Electron
    if registered_boxes:
        sorted_boxes = sorted(registered_boxes, key=lambda x: len(str(x.get('name', ''))), reverse=True)
        for box in sorted_boxes:
            box_name = remove_accents(str(box.get('name', ''))).upper()
            if box_name and box_name in normalized_output:
                detected_model = box.get('name')
                if detected_weight == 0:
                    detected_weight = box.get('weight_kg', 0)
                break

    # Fallbacks fixos reforçados se nenhum registro dinâmico bater
    if detected_model == "NÃO IDENTIF.":
        if "DELISSIUM" in normalized_output or "DELIS" in normalized_output:
            detected_model = "Delissium"
            if detected_weight == 0: detected_weight = 15
        elif "SAMBA" in normalized_output:
            if "DOCE" in normalized_output:
                detected_model = "Samba +Doce"
            else:
                detected_model = "Samba Preta"
            if detected_weight == 0: detected_weight = 13
        elif "VERDE" in normalized_output:
            detected_model = "Caixa Verde"
            if detected_weight == 0: detected_weight = 13
        elif "GENERICA" in normalized_output or "GENER" in normalized_output:
            detected_model = "Generica"
            if detected_weight == 0: detected_weight = 18
        elif "NERO" in normalized_output:
            detected_model = "Nero"
            if detected_weight == 0: detected_weight = 15
        elif "COOPY" in normalized_output or "COOP" in normalized_output:
            detected_model = "Coopyfrutas"
            if detected_weight == 0: detected_weight = 13
        elif "MIX" in normalized_output and "MELON" in normalized_output:
            detected_model = "Mix Melon"
            if detected_weight == 0: detected_weight = 13
            
    return detected_model, detected_weight, detected_weights

def count_fruits(frame, fruit_type, use_roi=None):
    """
    Identifica e conta melões/melancias usando filtragem HSV + Distance Transform / Watershed
    para separar frutos colados/encostados.
    """
    if frame is None:
        return 0, frame

    annotated_frame = frame.copy()
    fh, fw = frame.shape[:2]

    # ── Aplica ROI de frutas (câmera única). Com câmera de topo dedicada usa o quadro todo ──
    if roi_enabled if use_roi is None else use_roi:
        fruit_crop, (off_x, off_y) = crop_roi(frame, roi_fruits)
        rx0 = int(roi_fruits["x"] * fw)
        ry0 = int(roi_fruits["y"] * fh)
        rx1 = min(fw, rx0 + int(roi_fruits["w"] * fw))
        ry1 = min(fh, ry0 + int(roi_fruits["h"] * fh))
        cv2.rectangle(annotated_frame, (rx0, ry0), (rx1, ry1), (255, 200, 0), 2)
        cv2.putText(annotated_frame, "FRUTAS", (rx0 + 4, ry0 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 0), 1)

        lx0 = int(roi_label["x"] * fw)
        ly0 = int(roi_label["y"] * fh)
        lx1 = min(fw, lx0 + int(roi_label["w"] * fw))
        ly1 = min(fh, ly0 + int(roi_label["h"] * fh))
        cv2.rectangle(annotated_frame, (lx0, ly0), (lx1, ly1), (0, 165, 255), 2)
        cv2.putText(annotated_frame, "ETIQUETA/OCR", (lx0 + 4, ly0 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 165, 255), 1)
    else:
        fruit_crop = frame
        off_x, off_y = 0, 0
    # ─────────────────────────────────────────────────────────────────────────

    hsv = cv2.cvtColor(fruit_crop, cv2.COLOR_BGR2HSV)
    fruit_type = str(fruit_type).upper()
    
    mask = np.zeros((fruit_crop.shape[0], fruit_crop.shape[1]), dtype=np.uint8)
    
    is_yellow = "MELON" in fruit_type or "MELAO" in fruit_type or "MELÃO" in fruit_type
    is_green = "MELANCIA" in fruit_type or "WATERMELON" in fruit_type or "VERDE" in fruit_type
    
    if not is_yellow and not is_green:
        is_yellow = True
        is_green = True

    # Ajuste de intervalos HSV mais rigoroso (evita papelão kraft)
    if is_yellow:
        # Melão Amarelo: H (15-38), S (70-255), V (80-255) -> descarta papelão bege
        lower_y = np.array([12, 60, 70])
        upper_y = np.array([42, 255, 255])
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower_y, upper_y))
        
    if is_green:
        # Melancia/Melão Verde: H (35-85), S (40-255), V (40-255)
        lower_g = np.array([32, 35, 35])
        upper_g = np.array([90, 255, 255])
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower_g, upper_g))
    
    # Operações Morfológicas de Limpeza
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    opening = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
    sure_bg = cv2.dilate(opening, kernel, iterations=3)

    # Transformada de Distância para separar frutos encostados
    dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
    ret, sure_fg = cv2.threshold(dist_transform, 0.35 * dist_transform.max() if dist_transform.max() > 0 else 0, 255, 0)
    sure_fg = np.uint8(sure_fg)

    # Identificação de frutos individuais
    contours, _ = cv2.findContours(sure_fg if sure_fg.any() else opening, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    fruit_count = 0
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 250 < area < 120000:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                if circularity > 0.12:
                    fruit_count += 1
                    cnt_shifted = cnt + np.array([[[off_x, off_y]]])
                    cv2.drawContours(annotated_frame, [cnt_shifted], -1, (255, 0, 0), 2)
                    M = cv2.moments(cnt)
                    if M["m00"] != 0:
                        cX = int(M["m10"] / M["m00"]) + off_x
                        cY = int(M["m01"] / M["m00"]) + off_y
                        cv2.putText(annotated_frame, str(fruit_count), (cX - 10, cY + 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    # Limite de segurança anti-ruído
    if fruit_count > 20:
        print(f"⚠️ Calibre detectado muito alto ({fruit_count}). Provável ruído ou erro de leitura. Descartando.")
        fruit_count = 0
        cv2.rectangle(annotated_frame, (5, 10), (350, 70), (0, 0, 0), -1)
        cv2.putText(annotated_frame, "CALIBRE: NAO IDENTIF.", (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
    else:
        cv2.rectangle(annotated_frame, (5, 10), (350, 70), (0, 0, 0), -1)
        cv2.putText(annotated_frame, f"CALIBRE: {fruit_count}" if fruit_count > 0 else "CALIBRE: NAO IDENTIF.",
                    (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.2 if fruit_count == 0 else 1.5,
                    (0, 255, 0) if fruit_count > 0 else (0, 0, 255), 3)

    return fruit_count, annotated_frame

def open_camera(index):
    """Abre a câmera no índice fornecido testando backends compatíveis com Windows (CAP_DSHOW, CAP_MSMF) e Linux/Mac."""
    if sys.platform == "win32":
        try:
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if cap is not None and cap.isOpened():
                return cap
            if cap is not None:
                cap.release()
        except Exception:
            pass

        try:
            cap = cv2.VideoCapture(index, cv2.CAP_MSMF)
            if cap is not None and cap.isOpened():
                return cap
            if cap is not None:
                cap.release()
        except Exception:
            pass

    cap = cv2.VideoCapture(index)
    return cap

camera_change_requested = False
target_camera_index = 0
is_manual_selection = False

def video_loop():
    global current_frame, camera_change_requested, target_camera_index, is_manual_selection
    cap = None
    camera_error_logged = False
    current_index = 0
    tried_indices = [0, 1, 2, 3]
    
    while True:
        # Se o usuário solicitou uma mudança manual de câmera via interface (API /set_camera)
        if camera_change_requested:
            print(f"🔄 Mudança manual de câmera solicitada. Trocando do índice {current_index} para {target_camera_index}...")
            if cap is not None:
                cap.release()
                cap = None
            current_index = target_camera_index
            is_manual_selection = True
            camera_change_requested = False
            
        if cap is None or not cap.isOpened():
            if cap is not None:
                cap.release()
            
            # Tenta abrir no índice atual
            print(f"📡 Tentando abrir câmera no índice {current_index}...")
            cap = open_camera(current_index)
            if not cap.isOpened():
                # Se falhar, procura outros índices disponíveis
                next_index_found = False
                for idx in tried_indices:
                    if idx != current_index and idx not in aux_indices_in_use():
                        print(f"🔄 Câmera no índice {current_index} falhou. Tentando índice alternativo {idx}...")
                        test_cap = open_camera(idx)
                        if test_cap.isOpened():
                            cap = test_cap
                            current_index = idx
                            next_index_found = True
                            # Se mudou automaticamente devido a falha, resetamos o flag manual
                            is_manual_selection = False
                            break
                        else:
                            test_cap.release()
                
                if not next_index_found:
                    if not camera_error_logged:
                        print("❌ Câmera não encontrada (índices 0, 1, 2, 3). Conecte a câmera USB.")
                        camera_error_logged = True
                    time.sleep(5.0)
                    continue
            
            print(f"✅ Câmera no índice {current_index} aberta. Configurando resolução...")
            camera_error_logged = False
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # evita frames atrasados no buffer do driver
            
            # Se for uma seleção manual do usuário, NÃO fazemos o desvio automático por tela verde
            # (pois o usuário escolheu essa câmera especificamente e pode querer ver o visor dela mesmo assim)
            if not is_manual_selection:
                # Espera a câmera estabilizar e faz uma leitura de teste para verificar se é tela verde (dummy virtual camera)
                time.sleep(0.5)
                ret, test_frame = cap.read()
                if ret and is_solid_green_frame(test_frame):
                    print(f"⚠️ Detectada tela verde no índice {current_index} (câmera virtual ou erro). Procurando alternativa...")
                    cap.release()
                    found_valid = False
                    for idx in tried_indices:
                        if idx != current_index and idx not in aux_indices_in_use():
                            print(f"🔄 Testando índice alternativo {idx} contra tela verde...")
                            test_cap = open_camera(idx)
                            if test_cap.isOpened():
                                test_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                                test_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                                time.sleep(0.5)
                                ret_alt, frame_alt = test_cap.read()
                                if ret_alt and not is_solid_green_frame(frame_alt):
                                    cap = test_cap
                                    current_index = idx
                                    found_valid = True
                                    print(f"✅ Câmera real sem tela verde encontrada no índice {current_index}!")
                                    break
                                else:
                                    test_cap.release()
                    
                    if not found_valid:
                        # Se nenhuma alternativa prestou, volta para a primeira por segurança
                        print(f"⚠️ Nenhuma câmera alternativa sem tela verde encontrada. Mantendo índice {current_index} por fallback.")
                        cap = open_camera(current_index)
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        ret, frame = cap.read()
        if not ret:
            print(f"⚠️ Falha ao capturar frame da câmera no índice {current_index} (ocupada?)")
            time.sleep(1.0)
            continue
            
        ts = time.time()
        sharp = frame_sharpness(frame)
        with lock:
            current_frame = frame
            frame_buffer.append((ts, frame, sharp))
        # Sem sleep: cap.read() já bloqueia no ritmo da câmera. O sleep antigo
        # deixava o driver acumular frames velhos (imagem atrasada).

def aux_camera_loop(role):
    """Loop de captura de uma câmera lateral. Abre somente o índice configurado (sem auto-troca)."""
    cam = aux_cams[role]
    cap = None
    opened_index = None
    err_logged = False
    while True:
        idx = cam["index"]
        if idx != opened_index:
            if cap is not None:
                cap.release()
                cap = None
            opened_index = idx
            err_logged = False
            with lock:
                cam["frame"] = None
                cam["buffer"].clear()
                cam["open"] = False
        if idx is None:
            time.sleep(0.5)
            continue
        if cap is None or not cap.isOpened():
            cap = open_camera(idx)
            if not cap.isOpened():
                cap.release()
                cap = None
                with lock:
                    cam["open"] = False
                if not err_logged:
                    print(f"❌ Câmera {role} (índice {idx}) não abriu. Tentando de novo a cada 2s...")
                    err_logged = True
                time.sleep(2.0)
                continue
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)  # etiqueta precisa de mais resolução
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            err_logged = False
            print(f"✅ Câmera {role} aberta no índice {idx}.")
        ret, frame = cap.read()
        if not ret:
            print(f"⚠️ Falha ao capturar frame da câmera {role} (índice {idx}). Reabrindo...")
            cap.release()
            cap = None
            time.sleep(0.5)
            continue
        ts = time.time()
        sharp = frame_sharpness(frame)
        with lock:
            cam["frame"] = frame
            cam["buffer"].append((ts, frame, sharp))
            cam["open"] = True

def apply_camera_config():
    aux_cams["side"]["index"] = cv_config.get("side_camera")
    aux_cams["side2"]["index"] = cv_config.get("side2_camera")

global_registered_boxes = []
last_box_model = "NÃO IDENTIF."
last_detected_weight = 0
last_detected_weights = []

def ocr_worker():
    global last_box_model, last_detected_weight, last_detected_weights, global_registered_boxes
    while True:
        # Com câmera(s) lateral(is) ativa(s), o OCR lê delas (quadro inteiro).
        # Sem lateral, cai para a câmera única com a ROI de etiqueta.
        sources = [r for r in ("side", "side2") if aux_cams[r]["open"]] or ["top"]
        for src in sources:
            # Usa o frame mais nítido dos últimos 0,5s (evita borrão de movimento)
            frame_copy = pick_best_frame(0.5, src)
            if frame_copy is None:
                continue
            try:
                # OCR em background usa as caixas cadastradas recebidas do Electron
                model, weight, weights = analyze_box_ocr(
                    frame_copy, global_registered_boxes,
                    use_roi=(roi_enabled if src == "top" else False))
                if model != NI:
                    with lock:
                        ocr_history.append((time.time(), model, weight, weights, src))
                        last_box_model = model
                        last_detected_weight = weight
                        last_detected_weights = weights
            except Exception as e:
                print(f"⚠️ Erro na thread de OCR ({src}): {e}")
        # O próprio Tesseract já consome tempo; pausa curta para leitura contínua
        time.sleep(0.05)

@app.route('/status', methods=['GET'])
def get_status():
    model, weight, _, age_ms = current_box_reading()
    return jsonify({
        "box_model": model,
        "detected_weight": weight,
        "ocr_age_ms": age_ms
    })

@app.route('/set_camera', methods=['POST'])
def set_camera():
    global camera_change_requested, target_camera_index
    data = request.get_json(silent=True) or {}
    index = data.get("index")
    if index is not None:
        try:
            target_camera_index = int(index)
            if target_camera_index in aux_indices_in_use():
                return jsonify({"ok": False, "message": f"Índice {target_camera_index} já está em uso por uma câmera lateral"}), 409
            camera_change_requested = True
            print(f"🔄 Solicitada mudança manual de câmera para o índice: {target_camera_index}")
            return jsonify({"ok": True, "message": f"Mudando para canal {target_camera_index}"})
        except ValueError:
            return jsonify({"ok": False, "message": "Índice de câmera inválido"}), 400
    return jsonify({"ok": False, "message": "Parâmetro 'index' em falta"}), 400

@app.route('/cameras', methods=['GET'])
def get_cameras():
    """Estado das câmeras: topo (contagem) e laterais (etiqueta/OCR)."""
    return jsonify({
        "ok": True,
        "top": {"index": target_camera_index, "open": current_frame is not None},
        "side": {"index": aux_cams["side"]["index"], "open": aux_cams["side"]["open"]},
        "side2": {"index": aux_cams["side2"]["index"], "open": aux_cams["side2"]["open"]},
        "dual_mode": dual_mode(),
        "analyze_window_s": cv_config.get("analyze_window_s", ANALYZE_WINDOW_S),
    })

@app.route('/set_cameras', methods=['POST'])
def set_cameras():
    """Define câmeras laterais. Corpo: {"side": int|null, "side2": int|null, "analyze_window_s": float}"""
    data = request.get_json(silent=True) or {}
    new_cfg = {}
    for role, key in (("side", "side_camera"), ("side2", "side2_camera")):
        if role in data:
            v = data[role]
            new_cfg[key] = None if v in (None, "", "none", -1, "-1") else int(v)
    side = new_cfg.get("side_camera", cv_config.get("side_camera"))
    side2 = new_cfg.get("side2_camera", cv_config.get("side2_camera"))
    used = [i for i in (side, side2) if i is not None]
    if len(used) != len(set(used)) or target_camera_index in used:
        return jsonify({"ok": False, "message": "Cada câmera precisa de um índice diferente (topo, lateral, lateral 2)"}), 409
    if "analyze_window_s" in data:
        new_cfg["analyze_window_s"] = max(0.2, min(2.0, float(data["analyze_window_s"])))
    cv_config.update(new_cfg)
    save_cv_config()
    apply_camera_config()
    print(f"🎥 Câmeras laterais: side={side} side2={side2}")
    return get_cameras()

@app.route('/box_specs', methods=['GET', 'POST'])
def box_specs():
    """Lê/grava tabelas de calibre. POST: {"SAMBA": {"min_box_kg": 16, "min_fruit_kg": {"3": 6.0, ...}}}"""
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        if not isinstance(data, dict):
            return jsonify({"ok": False, "message": "JSON inválido"}), 400
        cv_config["box_specs"] = data
        save_cv_config()
    return jsonify({"ok": True, "box_specs": cv_config.get("box_specs")})

@app.route('/get_roi', methods=['GET'])
def get_roi():
    """Retorna as configurações atuais das ROIs."""
    return jsonify({
        "ok": True,
        "roi_enabled": roi_enabled,
        "roi_fruits": roi_fruits,
        "roi_label": roi_label
    })

@app.route('/set_roi', methods=['POST'])
def set_roi():
    """Atualiza as ROIs de frutas e/ou etiqueta recebidas do frontend.
    Espera um JSON com campos opcionais:
      roi_enabled: bool
      roi_fruits: { x, y, w, h }  (todos entre 0 e 1)
      roi_label:  { x, y, w, h }  (todos entre 0 e 1)
    """
    global roi_fruits, roi_label, roi_enabled
    data = request.get_json(silent=True) or {}

    if "roi_enabled" in data:
        roi_enabled = bool(data["roi_enabled"])

    def validate_roi(r):
        """Garante que todos os valores estão entre 0 e 1."""
        return {
            "x": max(0.0, min(1.0, float(r.get("x", 0)))),
            "y": max(0.0, min(1.0, float(r.get("y", 0)))),
            "w": max(0.01, min(1.0, float(r.get("w", 1)))),
            "h": max(0.01, min(1.0, float(r.get("h", 1)))),
        }

    if "roi_fruits" in data:
        roi_fruits = validate_roi(data["roi_fruits"])
        print(f"🎯 ROI frutas atualizada: {roi_fruits}")

    if "roi_label" in data:
        roi_label = validate_roi(data["roi_label"])
        print(f"🎯 ROI etiqueta atualizada: {roi_label}")

    return jsonify({
        "ok": True,
        "roi_enabled": roi_enabled,
        "roi_fruits": roi_fruits,
        "roi_label": roi_label
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    global global_registered_boxes, annotated_frame, annotated_until
    t0 = time.time()
    data = request.get_json(silent=True) or {}
    fruit = str(data.get("fruit", "")).upper()
    registered_boxes = data.get("registered_boxes", [])

    # Atualiza as caixas cadastradas na variável global para uso do background OCR worker
    if registered_boxes:
        global_registered_boxes = registered_boxes

    # Pega o frame MAIS NÍTIDO da janela recente da câmera de TOPO (a caixa pode já ter passado)
    frame_copy = pick_best_frame(None, "top")
    is_dual = dual_mode()
    count = 0
    if frame_copy is not None:
        try:
            # Conta as frutas e gera o frame anotado (MUITO RÁPIDO, ~20ms).
            # Com câmera lateral ativa, o topo é dedicado às frutas -> quadro inteiro.
            count, annotated = count_fruits(frame_copy, fruit, use_roi=(roi_enabled and not is_dual))
            # Mostra o frame anotado no visor por 1,5s SEM sobrescrever o frame da câmera
            # (antes o OCR passava a ler o frame com desenhos por cima)
            with lock:
                annotated_frame = annotated
                annotated_until = time.time() + 0.8
        except Exception as e:
            print(f"⚠️ Falha durante a análise síncrona: {e}")
            count = 0

    # Leitura de caixa por votação nas últimas leituras OCR (expira em OCR_TTL_SECONDS)
    box_model, detected_weight, detected_weights, ocr_age_ms = current_box_reading()
        
    # Lógica de peso condicional para caixas Samba
    if box_model == "Samba +Doce" or (box_model == "Samba Preta" and 16 in detected_weights and 15 in detected_weights):
        if "MELANCIA" in fruit or "WATERMELON" in fruit:
            detected_weight = 16
        else:
            detected_weight = 15
    elif box_model == "Samba Preta" and not detected_weights:
        detected_weight = 13
        
    # Validação cruzada: contagem (topo) x tabela de calibres da caixa (lateral)
    check = validate_caliber(count, box_model, detected_weight)

    print(f"✅ Análise ({'2 câmeras' if is_dual else '1 câmera'}). Fruta: {fruit} | Calibre: {count} | "
          f"Caixa: {box_model} | Peso: {detected_weight} | Validação: {check['validation']}")
    
    return jsonify({
        "ok": True,
        "caliber": f"CALIBRE {count}" if count > 0 else "NÃO IDENTIF.",
        "count": count,
        "confidence": 0.95 if count > 0 else 0.0,
        "box_model": box_model,
        "detected_weight": detected_weight,
        "validation": check["validation"],
        "min_fruit_kg": check["min_fruit_kg"],
        "expected_min_kg": check["expected_min_kg"],
        "allowed_calibers": check["allowed_calibers"],
        "warnings": check["warnings"],
        "dual_mode": is_dual,
        "ocr_age_ms": ocr_age_ms,
        "analyze_ms": int((time.time() - t0) * 1000)
    })

def generate_frames(source="top"):
    while True:
        with lock:
            if source == "top":
                if annotated_frame is not None and time.time() < annotated_until:
                    frame = annotated_frame.copy()
                else:
                    frame = current_frame.copy() if current_frame is not None else None
            else:
                f = aux_cams[source]["frame"]
                frame = f.copy() if f is not None else None
        box_model_draw, weight_draw, _, _ = current_box_reading()

        if frame is None:
            time.sleep(0.1)
            continue
            
        # Desenha em tempo real o que o OCR está enxergando
        if box_model_draw != "NÃO IDENTIF.":
            cv2.rectangle(frame, (5, 5), (400, 60), (0, 0, 0), -1)
            cv2.putText(frame, f"CAIXA: {box_model_draw}", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(frame, f"PESO: {weight_draw} KG", (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.rectangle(frame, (5, 5), (400, 40), (0, 0, 0), -1)
            cv2.putText(frame, "LENDO CAIXA...", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
            
        # Codifica o frame como JPEG
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        
        # Formato multipart para o navegador renderizar como vídeo contínuo
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
               
        time.sleep(0.05) # Limita stream da web para ~20 fps

@app.route('/video_feed')
def video_feed():
    """Stream MJPEG. ?cam=top (padrão, contagem) | side | side2 (etiqueta)."""
    source = request.args.get("cam", "top")
    if source not in ("top", "side", "side2"):
        source = "top"
    return Response(generate_frames(source), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🤖 SERVIÇO DE VISÃO COMPUTACIONAL ATIVO (MODO INSTANTÂNEO + BACKGROUND OCR)")
    print("📡 Aguardando comandos em: http://localhost:5000/analyze")
    print("🎥 Stream visual em: http://localhost:5000/video_feed")
    print("="*50 + "\n")
    
    # Silencia o log por requisição do Flask (enchia o stderr a cada leitura/frame)
    logging.getLogger('werkzeug').setLevel(logging.ERROR)

    # Carrega configuração de câmeras laterais e tabelas de calibre
    load_cv_config()
    apply_camera_config()
    for role in ("side", "side2"):
        threading.Thread(target=aux_camera_loop, args=(role,), daemon=True).start()
    print(f"🎥 Laterais configuradas: side={cv_config.get('side_camera')} side2={cv_config.get('side2_camera')}")

    # Inicia a thread de OCR em segundo plano
    ocr_thread = threading.Thread(target=ocr_worker, daemon=True)
    ocr_thread.start()
    
    # Inicia a API Flask em uma thread separada
    api_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False), daemon=True)
    api_thread.start()
    
    # O macOS exige que o acesso à câmera (cv2.VideoCapture) seja feito na MAIN THREAD
    video_loop()

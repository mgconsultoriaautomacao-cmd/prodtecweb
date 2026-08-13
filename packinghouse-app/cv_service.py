import cv2
import numpy as np
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import threading
import time
import subprocess
import os
import sys
import unicodedata

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

def analyze_box_ocr(frame, registered_boxes=None):
    output = ""
    used_engine = "NONE"

    # Aplica ROI de etiqueta antes do OCR para evitar poluição de outras caixas ao fundo
    ocr_frame = frame
    if roi_enabled:
        ocr_frame, _ = crop_roi(frame, roi_label)

    # Verifica se o frame está nítido o suficiente para tentar OCR (evita motion blur)
    if is_frame_blurry(ocr_frame):
        print("⏭️ [OCR] Frame borrado (motion blur). Pulando OCR neste ciclo.")
        return "NÃO IDENTIF.", 0, []

    # 1. Tenta usar o Pytesseract (Windows / Raspberry Pi / Mac com Tesseract instalado)
    if HAS_PYTESSERACT:
        try:
            if sys.platform == "win32":
                possible_tesseract_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Tesseract-OCR", "tesseract.exe")
                ]
                for p in possible_tesseract_paths:
                    if os.path.exists(p):
                        pytesseract.pytesseract.tesseract_cmd = p
                        break

            img_rgb = cv2.cvtColor(ocr_frame, cv2.COLOR_BGR2RGB)
            output = pytesseract.image_to_string(img_rgb)
            used_engine = "TESSERACT"
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
                print(f"⚠️ Erro ao executar OCR nativo Mac fallback: {e}")
        else:
            print(f"❌ Fallback Mac: Executável OCR não encontrado em {OCR_PATH}")

    output_upper = output.upper() if output else ""
    if output_upper.strip():
        print(f"🔍 [OCR] Texto lido com sucesso usando a engine {used_engine}!")

    # 3. Processa a saída para achar modelo/marca e peso
    detected_weights = []
    # Procura por pesos explícitos (ex: "13KG", "15 KG", etc.)
    for w in [18, 16, 15, 13, 12, 10, 5]:
        if f"{w}KG" in output_upper or f"{w} KG" in output_upper or f" {w} KG" in output_upper:
            detected_weights.append(w)
            
    detected_weight = detected_weights[0] if detected_weights else 0
    detected_model = "NÃO IDENTIF."

    # Matching dinâmico com caixas cadastradas no Electron
    if registered_boxes:
        # Ordena caixas pelo comprimento do nome em ordem decrescente para priorizar nomes específicos/compostos
        sorted_boxes = sorted(registered_boxes, key=lambda x: len(str(x.get('name', ''))), reverse=True)
        normalized_output = remove_accents(output_upper)
        for box in sorted_boxes:
            box_name = remove_accents(str(box.get('name', ''))).upper()
            if box_name and box_name in normalized_output:
                detected_model = box.get('name')
                if detected_weight == 0:
                    detected_weight = box.get('weight_kg', 0)
                break

    # Fallbacks fixos se nenhum registro dinâmico bater (retrocompatibilidade)
    if detected_model == "NÃO IDENTIF.":
        if "DELISSIUM" in output_upper:
            detected_model = "Delissium"
            if detected_weight == 0:
                detected_weight = 15
        elif "SAMBA" in output_upper:
            if "+DOCE" in output_upper or "DOCE" in output_upper:
                detected_model = "Samba +Doce"
            else:
                detected_model = "Samba Preta"
            if detected_weight == 0:
                detected_weight = 13
        elif "VERDE" in output_upper:
            detected_model = "Caixa Verde"
            if detected_weight == 0:
                detected_weight = 13
        elif "GENERICA" in output_upper or "GENÉRICA" in output_upper:
            detected_model = "Generica"
            if detected_weight == 0:
                detected_weight = 18
        elif "NERO" in output_upper:
            detected_model = "Nero"
            if detected_weight == 0:
                detected_weight = 15
        elif "COOPYFRUTAS" in output_upper:
            detected_model = "Coopyfrutas"
            if detected_weight == 0:
                detected_weight = 13
        elif "MIX MELON" in output_upper:
            detected_model = "Mix Melon"
            if detected_weight == 0:
                detected_weight = 13
            
    return detected_model, detected_weight, detected_weights

def is_solid_green_frame(frame):
    if frame is None:
        return False
    # OpenCV uses BGR. Channels: 0=Blue, 1=Green, 2=Red. Mean returns (B, G, R, Alpha)
    mean_b, mean_g, mean_r, _ = cv2.mean(frame)
    # Virtual camera standby screens or driver failures often output a solid green frame (G > 150, B/R < 60)
    if mean_g > 150 and mean_b < 60 and mean_r < 60:
        std_dev = np.std(frame)
        if std_dev < 30: # very low variance, i.e., solid uniform color
            return True
    return False

def count_fruits(frame, fruit_type):
    """
    Identifica e conta melões/melancias usando filtragem de cores HSV.
    Quando roi_enabled=True, analisa apenas a ROI de frutas para evitar
    contar frutas de caixas vizinhas ao fundo.
    """
    if frame is None:
        return 0, frame

    annotated_frame = frame.copy()
    fh, fw = frame.shape[:2]

    # ── Aplica ROI de frutas ──────────────────────────────────────────────────
    if roi_enabled:
        fruit_crop, (off_x, off_y) = crop_roi(frame, roi_fruits)
        # Desenha o retângulo da ROI de frutas no frame anotado (azul claro)
        rx0 = int(roi_fruits["x"] * fw)
        ry0 = int(roi_fruits["y"] * fh)
        rx1 = min(fw, rx0 + int(roi_fruits["w"] * fw))
        ry1 = min(fh, ry0 + int(roi_fruits["h"] * fh))
        cv2.rectangle(annotated_frame, (rx0, ry0), (rx1, ry1), (255, 200, 0), 2)
        cv2.putText(annotated_frame, "FRUTAS", (rx0 + 4, ry0 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 200, 0), 1)
        # Desenha o retângulo da ROI de etiqueta (laranja)
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
    
    # Define intervalos HSV para segmentar as cores da fruta
    mask = np.zeros((fruit_crop.shape[0], fruit_crop.shape[1]), dtype=np.uint8)
    
    is_yellow = "MELON" in fruit_type or "MELAO" in fruit_type or "MELÃO" in fruit_type
    is_green = "MELANCIA" in fruit_type or "WATERMELON" in fruit_type or "VERDE" in fruit_type
    
    if not is_yellow and not is_green:
        is_yellow = True
        is_green = True

    if is_yellow:
        lower_y = np.array([5, 30, 30])
        upper_y = np.array([45, 255, 255])
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower_y, upper_y))
        
    if is_green:
        lower_g = np.array([25, 20, 20])
        upper_g = np.array([95, 255, 255])
        mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower_g, upper_g))
    
    # Limpeza morfológica para separar frutos colados
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    fruit_count = 0
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 400 < area < 150000:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                if circularity > 0.15:
                    fruit_count += 1
                    # Translada o contorno de volta para o espaço do frame original
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
                    if idx != current_index:
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
                        print("❌ ERRO: Não foi possível abrir nenhuma câmera (índices 0, 1, 2, 3). Verifique conexões/permissões.")
                        camera_error_logged = True
                    time.sleep(2.0)
                    continue
            
            print(f"✅ Câmera no índice {current_index} aberta. Configurando resolução...")
            camera_error_logged = False
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
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
                        if idx != current_index:
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
            
        with lock:
            current_frame = frame.copy()
            
        time.sleep(0.03) # Limita a ~30 fps para não usar muita CPU

global_registered_boxes = []
last_box_model = "NÃO IDENTIF."
last_detected_weight = 0
last_detected_weights = []

def ocr_worker():
    global last_box_model, last_detected_weight, last_detected_weights, global_registered_boxes
    while True:
        frame_copy = None
        with lock:
            if current_frame is not None:
                frame_copy = current_frame.copy()
            
        if frame_copy is not None:
            try:
                # OCR em background usa as caixas cadastradas recebidas do Electron
                model, weight, weights = analyze_box_ocr(frame_copy, global_registered_boxes)
                if model != "NÃO IDENTIF.":
                    with lock:
                        last_box_model = model
                        last_detected_weight = weight
                        last_detected_weights = weights
            except Exception as e:
                print(f"⚠️ Erro na thread de OCR: {e}")
        # Roda OCR a cada 0.5s em segundo plano para capturas mais rápidas
        time.sleep(0.5)

@app.route('/status', methods=['GET'])
def get_status():
    global last_box_model, last_detected_weight
    with lock:
        return jsonify({
            "box_model": last_box_model,
            "detected_weight": last_detected_weight
        })

@app.route('/set_camera', methods=['POST'])
def set_camera():
    global camera_change_requested, target_camera_index
    data = request.get_json(silent=True) or {}
    index = data.get("index")
    if index is not None:
        try:
            target_camera_index = int(index)
            camera_change_requested = True
            print(f"🔄 Solicitada mudança manual de câmera para o índice: {target_camera_index}")
            return jsonify({"ok": True, "message": f"Mudando para canal {target_camera_index}"})
        except ValueError:
            return jsonify({"ok": False, "message": "Índice de câmera inválido"}), 400
    return jsonify({"ok": False, "message": "Parâmetro 'index' em falta"}), 400

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
    global current_frame, global_registered_boxes
    data = request.get_json(silent=True) or {}
    fruit = str(data.get("fruit", "")).upper()
    registered_boxes = data.get("registered_boxes", [])

    # Atualiza as caixas cadastradas na variável global para uso do background OCR worker
    if registered_boxes:
        global_registered_boxes = registered_boxes

    frame_copy = None
    with lock:
        if current_frame is not None:
            frame_copy = current_frame.copy()
            
    if frame_copy is not None:
        try:
            # Conta as frutas e gera o frame anotado (MUITO RÁPIDO, ~20ms)
            count, annotated_frame = count_fruits(frame_copy, fruit)
            
            # Atualiza o visor com o frame anotado
            with lock:
                current_frame = annotated_frame.copy()
        except Exception as e:
            print(f"⚠️ Falha durante a análise síncrona: {e}")
            count = 0
            
        # Usa os dados do OCR que foram lidos em background para responder instantaneamente
        with lock:
            box_model = last_box_model
            detected_weight = last_detected_weight
            detected_weights = list(last_detected_weights)
    else:
        # Fallback para o estado em cache
        with lock:
            count = 0
            box_model = last_box_model
            detected_weight = last_detected_weight
            detected_weights = list(last_detected_weights)
        
    # Lógica de peso condicional para caixas Samba
    if box_model == "Samba +Doce" or (box_model == "Samba Preta" and 16 in detected_weights and 15 in detected_weights):
        if "MELANCIA" in fruit or "WATERMELON" in fruit:
            detected_weight = 16
        else:
            detected_weight = 15
    elif box_model == "Samba Preta" and not detected_weights:
        detected_weight = 13
        
    print(f"✅ Análise instantânea disparada pelo leitor. Fruta: {fruit} | Retornando calibre: {count} | Caixa: {box_model} | Peso: {detected_weight}")
    
    return jsonify({
        "ok": True,
        "caliber": f"CALIBRE {count}" if count > 0 else "NÃO IDENTIF.",
        "count": count,
        "confidence": 0.95 if count > 0 else 0.0,
        "box_model": box_model,
        "detected_weight": detected_weight
    })

def generate_frames():
    while True:
        with lock:
            frame = current_frame.copy() if current_frame is not None else None
            box_model_draw = last_box_model
            weight_draw = last_detected_weight
            
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
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🤖 SERVIÇO DE VISÃO COMPUTACIONAL ATIVO (MODO INSTANTÂNEO + BACKGROUND OCR)")
    print("📡 Aguardando comandos em: http://localhost:5000/analyze")
    print("🎥 Stream visual em: http://localhost:5000/video_feed")
    print("="*50 + "\n")
    
    # Inicia a thread de OCR em segundo plano
    ocr_thread = threading.Thread(target=ocr_worker, daemon=True)
    ocr_thread.start()
    
    # Inicia a API Flask em uma thread separada
    api_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False), daemon=True)
    api_thread.start()
    
    # O macOS exige que o acesso à câmera (cv2.VideoCapture) seja feito na MAIN THREAD
    video_loop()

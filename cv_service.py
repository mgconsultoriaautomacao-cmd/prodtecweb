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

def is_frame_blurry(frame, threshold=50.0):
    """Retorna True se o frame estiver muito borrado (motion blur ou desfocado)."""
    if frame is None or frame.size == 0:
        return True
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    return variance < threshold

def crop_roi(frame, roi_dict):
    """
    Corta um retângulo (ROI) do frame com base em coordenadas normalizadas (0..1).
    Retorna (sub_image, (x_px, y_px, w_px, h_px)).
    """
    h, w = frame.shape[:2]
    rx = int(clamp(roi_dict.get("x", 0.0), 0.0, 1.0) * w)
    ry = int(clamp(roi_dict.get("y", 0.0), 0.0, 1.0) * h)
    rw = int(clamp(roi_dict.get("w", 1.0), 0.0, 1.0) * w)
    rh = int(clamp(roi_dict.get("h", 1.0), 0.0, 1.0) * h)
    
    # Garante que rw e rh fiquem dentro do limite do frame
    rw = max(1, min(rw, w - rx))
    rh = max(1, min(rh, h - ry))
    
    cropped = frame[ry:ry+rh, rx:rx+rw]
    return cropped, (rx, ry, rw, rh)

def clamp(val, min_val, max_val):
    return max(min_val, min(val, max_val))

def run_ocr(frame):
    """
    Executa OCR no frame completo ou na ROI da etiqueta (se ativada).
    No macOS usa a ferramenta 'ocr' nativa da Apple Vision se o Pytesseract não funcionar.
    No Windows / Linux usa pytesseract (Tesseract-OCR).
    """
    global roi_label, roi_enabled

    output = ""
    used_engine = "NENHUM"

    if frame is None:
        return "SEM FRAME", 0, []

    # Se a ROI estiver ativada, faz o corte apenas da área da etiqueta
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
            print(f"⚠️ Pytesseract falhou: {e}")

    # 2. Se o Pytesseract falhar ou não estiver disponível, tenta o OCR nativo do Mac
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

    # Limpeza e pós-processamento do texto extraído
    lines = [line.strip() for line in output.split('\n') if line.strip()]
    full_text = " ".join(lines)
    
    # ── EXTRAÇÃO ESTRUTURADA DE DADOS DA ETIQUETA (VARIEDADE, LOTE, PESO, PRODUTOR) ──
    extracted_data = parse_label_text(full_text, lines)
    
    print(f"🔍 [OCR - {used_engine}] Texto Bruto: '{full_text}'")
    print(f"📋 [OCR] Dados Extraídos: {extracted_data}")

    return full_text, len(lines), lines, extracted_data

def parse_label_text(full_text, lines):
    """
    Analisa o texto extraído da etiqueta e tenta identificar campos chave de rastreabilidade:
    - Variedade (ex: Palmer, Tommy, Kent, Keitt, Tommy Atkins, Espada, Haden)
    - Lote / Código (ex: Lote 1234, LOTE-99, L: 884)
    - Peso Liquido / Bruto (ex: 4.5kg, 4,5 kg, 5KG)
    - Produtor / Fazenda (ex: Fazenda Santa Maria, Sitio Sol)
    """
    data = {
        "variedade": None,
        "lote": None,
        "peso": None,
        "produtor": None,
        "calibre": None
    }
    
    text_clean = remove_accents(full_text.upper())
    
    # Listas de variedades comuns de frutas (manga, uva, citros, etc.)
    varieties = [
        "PALMER", "TOMMY", "TOMMY ATKINS", "KENT", "KEITT", "HADEN", "ESPADA", "ROSA", "MAGITA",
        "VALENCIA", "PEAR", "THOMPSON", "CRIMSON", "ARRA", "ITALIA", "NUBIA", "VICTORIA"
    ]
    for v in varieties:
        if v in text_clean:
            data["variedade"] = v
            break

    # Padrão Regex básico para Lote (ex: LOTE 1234, LOTE: 456, L-789)
    import re
    lote_match = re.search(r'(?:LOTE|LOT|LT)[\s\:\-]*([A-Z0-9\-]{2,12})', text_clean)
    if lote_match:
        data["lote"] = lote_match.group(1)

    # Padrão Regex para Peso (ex: 4.5KG, 4,2 KG, 5 KG)
    peso_match = re.search(r'(\d+[[\.\,]\d+]?\s*KG)', text_clean)
    if peso_match:
        data["peso"] = peso_match.group(1)

    # Padrão Regex para Calibre / Contagem (ex: CALIBRE 10, CAL: 12, CAT 1)
    calibre_match = re.search(r'(?:CALIBRE|CAL|CAT)[\s\:\-]*(\d{1,2})', text_clean)
    if calibre_match:
        data["calibre"] = calibre_match.group(1)

    # Tentativa de identificar o Produtor se houver palavras como FAZENDA, SITIO, AGRICOLA, HORTI
    for line in lines:
        line_clean = remove_accents(line.upper())
        if any(keyword in line_clean for keyword in ["FAZENDA", "SITIO", "AGRICOLA", "PRODUTOR", "FARM", "FRUTAS"]):
            data["produtor"] = line
            break

    return data

def process_image(frame):
    """
    Analisa o frame para contagem de frutas por Visão Computacional.
    Se a ROI de frutas estiver ativada, corta e processa apenas a região delimitada.
    """
    global roi_fruits, roi_enabled

    if frame is None:
        return 0, None

    h_orig, w_orig = frame.shape[:2]

    # Corta a ROI de frutas se estiver ativada
    if roi_enabled:
        analysis_image, (rx, ry, rw, rh) = crop_roi(frame, roi_fruits)
    else:
        analysis_image = frame
        rx, ry, rw, rh = 0, 0, w_orig, h_orig

    # Redimensiona para processamento rápido mantendo proporção
    h_crop, w_crop = analysis_image.shape[:2]
    target_width = 640
    scale = target_width / float(w_crop) if w_crop > 0 else 1.0
    
    if scale != 1.0 and w_crop > 0:
        resized = cv2.resize(analysis_image, (target_width, int(h_crop * scale)))
    else:
        resized = analysis_image.copy()

    # 1. Filtro gaussiano para suavizar ruído de fundo
    blurred = cv2.GaussianBlur(resized, (9, 9), 2)
    
    # 2. Conversão para HSV (útil para detectar tons de frutas: verde, amarelo, vermelho)
    hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)
    
    # 3. Intervalos de cores para frutas (Mangas/Uvas/Citros: tons amarelados, alaranjados e verdes)
    # Amarelo/Laranja (Manga madura)
    lower_yellow = np.array([10, 80, 80])
    upper_yellow = np.array([35, 255, 255])
    mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)
    
    # Verde (Manga de vez / Uva / Citros)
    lower_green = np.array([36, 50, 50])
    upper_green = np.array([85, 255, 255])
    mask_green = cv2.inRange(hsv, lower_green, upper_green)

    # Vermelho/Alaranjado (Manga Tommy)
    lower_red1 = np.array([0, 70, 70])
    upper_red1 = np.array([9, 255, 255])
    lower_red2 = np.array([170, 70, 70])
    upper_red2 = np.array([180, 255, 255])
    mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
    
    # Combina todas as máscaras de cor de frutos
    fruit_mask = mask_yellow | mask_green | mask_red
    
    # 4. Operações morfológicas (Abertura e Fechamento) para isolar formas esféricas
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_OPEN, kernel, iterations=2)
    fruit_mask = cv2.morphologyEx(fruit_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    # 5. Encontra contornos das frutas detectadas
    contours, _ = cv2.findContours(fruit_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    fruit_count = 0
    annotated_frame = frame.copy()

    # Área mínima do objeto para ser considerado uma fruta (evita falsos positivos)
    min_contour_area = 1500 * (scale ** 2)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_contour_area:
            fruit_count += 1
            
            # Converte as coordenadas do contorno redimensionado de volta para o frame original
            # 1. Escala de volta para a ROI
            cnt_roi = (cnt / scale).astype(np.int32)
            # 2. Desloca as coordenadas para o offset da ROI no frame completo
            cnt_full = cnt_roi + np.array([rx, ry])
            
            # Desenha os contornos e caixa delimitadora no frame original
            x, y, w_box, h_box = cv2.boundingRect(cnt_full)
            cv2.rectangle(annotated_frame, (x, y), (x + w_box, y + h_box), (0, 255, 0), 2)
            cv2.circle(annotated_frame, (x + w_box // 2, y + h_box // 2), 4, (0, 0, 255), -1)
            cv2.putText(annotated_frame, f"Fruta #{fruit_count}", (x, max(20, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Desenha as caixas das ROIs ativas no frame anotado para feedback visual do operador
    if roi_enabled:
        # ROI de frutas (Verde Limão)
        fx, fy, fw, fh = int(roi_fruits["x"]*w_orig), int(roi_fruits["y"]*h_orig), int(roi_fruits["w"]*w_orig), int(roi_fruits["h"]*h_orig)
        cv2.rectangle(annotated_frame, (fx, fy), (fx + fw, fy + fh), (50, 255, 50), 2)
        cv2.putText(annotated_frame, "ROI FRUTAS", (fx + 5, fy + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 255, 50), 2)

        # ROI de etiqueta (Ciano)
        lx, ly, lw, lh = int(roi_label["x"]*w_orig), int(roi_label["y"]*h_orig), int(roi_label["w"]*w_orig), int(roi_label["h"]*h_orig)
        cv2.rectangle(annotated_frame, (lx, ly), (lx + lw, ly + lh), (255, 255, 0), 2)
        cv2.putText(annotated_frame, "ROI ETIQUETA / OCR", (lx + 5, ly + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

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
            
        # Processa contagem automática de frutas a cada frame
        count, _ = process_image(frame)
        with lock:
            global current_count
            current_count = count
            
        time.sleep(0.03)

def is_solid_green_frame(frame):
    """Verifica se a imagem capturada é uma tela verde sólida (comum em câmeras virtuais do Windows/OBS sem sinal)"""
    if frame is None or frame.size == 0:
        return False
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    # Canal H do verde fica entre ~35 e 85
    mean_h = np.mean(hsv[:, :, 0])
    mean_s = np.mean(hsv[:, :, 1])
    std_h = np.std(hsv[:, :, 0])
    # Se o matiz médio for verde (35..85), a saturação for alta e o desvio padrão do matiz for muito baixo, é tela verde
    return (40 <= mean_h <= 80) and (mean_s > 100) and (std_h < 10)

def generate_frames():
    global current_frame
    while True:
        with lock:
            if current_frame is None:
                frame_to_send = None
            else:
                # Gera o frame anotado com caixas delimitadoras e ROIs visíveis
                _, annotated = process_image(current_frame)
                frame_to_send = annotated

        if frame_to_send is None:
            time.sleep(0.1)
            continue

        ret, buffer = cv2.imencode('.jpg', frame_to_send, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# ─── ROTAS DA API FLASK ───────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """Rota de verificação de status do serviço Python"""
    return jsonify({
        "status": "online",
        "service": "PRODTEC Computer Vision Service",
        "has_pytesseract": HAS_PYTESSERACT,
        "platform": sys.platform,
        "roi_enabled": roi_enabled,
        "current_camera_index": target_camera_index
    })

@app.route('/set_camera', methods=['POST'])
def set_camera():
    """
    Alterna manualmente o índice da câmera de vídeo em tempo de execução.
    Payload JSON: { "index": 0 } ou { "index": 1 }, etc.
    """
    global camera_change_requested, target_camera_index
    data = request.json or {}
    new_index = data.get("index", 0)
    
    try:
        new_index = int(new_index)
        target_camera_index = new_index
        camera_change_requested = True
        print(f"📥 Solicitação recebida via API para mudar para a câmera índice {new_index}")
        return jsonify({"success": True, "target_index": new_index, "message": f"Mudando para câmera #{new_index}..."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/set_roi', methods=['POST'])
def set_roi():
    """
    Ajusta dinamicamente as regiões de interesse (ROI) para Frutas e Etiqueta.
    Payload JSON:
    {
      "enabled": true,
      "fruits": { "x": 0.05, "y": 0.02, "w": 0.90, "h": 0.60 },
      "label":  { "x": 0.05, "y": 0.62, "w": 0.90, "h": 0.35 }
    }
    """
    global roi_fruits, roi_label, roi_enabled
    data = request.json or {}
    
    if "enabled" in data:
        roi_enabled = bool(data["enabled"])
        
    if "fruits" in data and isinstance(data["fruits"], dict):
        roi_fruits.update(data["fruits"])
        
    if "label" in data and isinstance(data["label"], dict):
        roi_label.update(data["label"])

    print(f"🎯 ROI Atualizado: Enabled={roi_enabled} | Fruits={roi_fruits} | Label={roi_label}")

    return jsonify({
        "success": True,
        "roi_enabled": roi_enabled,
        "roi_fruits": roi_fruits,
        "roi_label": roi_label
    })

@app.route('/count', methods=['GET'])
def get_count():
    """Retorna a contagem atual de frutas em tempo real"""
    with lock:
        count = current_count
    return jsonify({"count": count, "success": True})

@app.route('/ocr', methods=['POST'])
def trigger_ocr():
    """Rota disparada pelo botão 'Ler Etiqueta' para processar a etiqueta na ROI atual"""
    with lock:
        if current_frame is None:
            return jsonify({"success": False, "error": "Nenhum frame da câmera capturado ainda"}), 400
        frame_copy = current_frame.copy()

    full_text, line_count, lines, extracted_data = run_ocr(frame_copy)

    return jsonify({
        "success": True,
        "full_text": full_text,
        "line_count": line_count,
        "lines": lines,
        "extracted_data": extracted_data
    })

@app.route('/video_feed')
def video_feed():
    """Stream MJPEG do visor da câmera em tempo real para ser exibido na Tag <img> do frontend"""
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    # Inicia a captura e o loop de vídeo em uma thread separada para não bloquear o servidor Flask
    if sys.platform != "darwin":
        t = threading.Thread(target=video_loop, daemon=True)
        t.start()
        print("🚀 Servidor Flask de Visão Computacional iniciado na porta 5001...")
        app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
    else:
        # O macOS exige que o acesso à câmera (cv2.VideoCapture) seja feito na MAIN THREAD
        t_flask = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5001, debug=False, threaded=True), daemon=True)
        t_flask.start()
        print("🚀 Servidor Flask iniciado em segundo plano (Mac main-thread video loop)...")
        video_loop()

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

# Caminho absoluto para o utilitário OCR nativo do Mac (fallback)
OCR_PATH = "/Users/manoelgoncalo/.gemini/antigravity-ide/brain/94a3a46d-01a4-46b2-be76-4bb94970fbdb/scratch/ocr"
TEMP_FRAME_PATH = "/Users/manoelgoncalo/Downloads/packinghouse-web/scratch/current_frame.jpg"

def analyze_box_ocr(frame, registered_boxes=None):
    output = ""
    used_engine = "NONE"

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

            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            output = pytesseract.image_to_string(img_rgb)
            used_engine = "TESSERACT"
        except Exception as e:
            print(f"⚠️ Pytesseract falhou (verifique se o executável do Tesseract-OCR está instalado): {e}")

    # 2. Se o Pytesseract falhar ou não estiver disponível, tenta o OCR nativo do Mac se estiver em macOS
    if not output.strip() and sys.platform == "darwin":
        if os.path.exists(OCR_PATH):
            os.makedirs(os.path.dirname(TEMP_FRAME_PATH), exist_ok=True)
            cv2.imwrite(TEMP_FRAME_PATH, frame)
            
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
            
    return detected_model, detected_weight, detected_weights

def count_fruits(frame, fruit_type):
    """
    Identifica e conta melões/melancias usando filtragem de cores HSV
    e transformada de círculos/contornos.
    """
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    fruit_type = str(fruit_type).upper()
    
    # Define intervalos HSV para segmentar as cores da fruta
    if "MELON" in fruit_type or "MELAO" in fruit_type or "MELÃO" in fruit_type:
        # Canal amarelo/laranja para melão amarelo
        lower_color = np.array([10, 40, 40])
        upper_color = np.array([40, 255, 255])
    else:
        # Canal verde para melancia/outros frutos verdes
        lower_color = np.array([30, 30, 30])
        upper_color = np.array([90, 255, 255])
        
    mask = cv2.inRange(hsv, lower_color, upper_color)
    
    # Limpeza morfológica para separar frutos colados
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)
    
    # Encontra contornos na máscara binária
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    fruit_count = 0
    annotated_frame = frame.copy()
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Filtra ruídos pequenos e áreas excessivamente grandes
        if 800 < area < 40000:
            perimeter = cv2.arcLength(cnt, True)
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                # Aceita formatos de circularidade de circular a elíptico (>= 0.45)
                if circularity > 0.45:
                    fruit_count += 1
                    # Desenha contorno em azul
                    cv2.drawContours(annotated_frame, [cnt], -1, (255, 0, 0), 2)
                    
                    # Coloca o índice no centro do fruto
                    M = cv2.moments(cnt)
                    if M["m00"] != 0:
                        cX = int(M["m10"] / M["m00"])
                        cY = int(M["m01"] / M["m00"])
                        cv2.putText(annotated_frame, str(fruit_count), (cX - 10, cY + 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                                    
    # Fallback: Transformada de Hough para círculos caso os contornos falhem totalmente (retornando 0)
    if fruit_count == 0:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.medianBlur(gray, 5)
        circles = cv2.HoughCircles(
            gray, 
            cv2.HOUGH_GRADIENT, 
            dp=1.2, 
            minDist=40, 
            param1=50, 
            param2=30, 
            minRadius=25, 
            maxRadius=120
        )
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            for (x, y, r) in circles:
                cv2.circle(annotated_frame, (x, y), r, (0, 255, 0), 2)
                fruit_count += 1
                cv2.putText(annotated_frame, f"H{fruit_count}", (x - 10, y + 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # Cria caixa visual do calibre na tela do visor
    cv2.rectangle(annotated_frame, (5, 10), (350, 70), (0, 0, 0), -1)
    cv2.putText(annotated_frame, f"CALIBRE: {fruit_count}", (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

    return fruit_count, annotated_frame

def video_loop():
    global current_frame
    cap = None
    camera_error_logged = False
    
    while True:
        if cap is None or not cap.isOpened():
            if cap is not None:
                cap.release()
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                if not camera_error_logged:
                    print("❌ ERRO: Não foi possível abrir a câmera. Verifique se ela está sendo usada por outro app ou se as permissões foram concedidas ao Terminal.")
                    camera_error_logged = True
                time.sleep(2.0)
                continue
            else:
                print("✅ Câmera aberta com sucesso!")
                camera_error_logged = False
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Falha ao capturar frame (câmera ocupada?)")
            time.sleep(1.0)
            continue
            
        with lock:
            current_frame = frame.copy()
            
        time.sleep(0.03) # Limita a ~30 fps para não usar muita CPU

last_box_model = "NÃO IDENTIF."
last_detected_weight = 0
last_detected_weights = []

def ocr_worker():
    global last_box_model, last_detected_weight, last_detected_weights
    while True:
        frame_copy = None
        with lock:
            if current_frame is not None:
                frame_copy = current_frame.copy()
            
        if frame_copy is not None:
            try:
                # OCR em background usa fallback vazio para caixas dinâmicas
                model, weight, weights = analyze_box_ocr(frame_copy, None)
                if model != "NÃO IDENTIF.":
                    with lock:
                        last_box_model = model
                        last_detected_weight = weight
                        last_detected_weights = weights
            except Exception as e:
                print(f"⚠️ Erro na thread de OCR: {e}")
        # Roda OCR a cada 1.2s em segundo plano para não pegar muita CPU
        time.sleep(1.2)

@app.route('/analyze', methods=['POST'])
def analyze():
    global current_frame
    data = request.get_json(silent=True) or {}
    fruit = str(data.get("fruit", "")).upper()
    registered_boxes = data.get("registered_boxes", [])

    frame_copy = None
    with lock:
        if current_frame is not None:
            frame_copy = current_frame.copy()
            
    if frame_copy is not None:
        try:
            # Analisa o modelo e peso da caixa com base no cadastro do DB
            box_model, detected_weight, detected_weights = analyze_box_ocr(frame_copy, registered_boxes)
            # Conta as frutas e gera o frame anotado
            count, annotated_frame = count_fruits(frame_copy, fruit)
            
            # Atualiza o visor com o frame anotado (com os círculos e contornos pintados)
            with lock:
                current_frame = annotated_frame.copy()
        except Exception as e:
            print(f"⚠️ Falha durante a análise síncrona: {e}")
            count = 0
            box_model = "NÃO IDENTIF."
            detected_weight = 0
            detected_weights = []
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
            frame = current_frame
            
        if frame is None:
            time.sleep(0.1)
            continue
            
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

import cv2
import mediapipe as mp
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import threading
import time
import subprocess
import os
import sys

# Tenta importar o pytesseract para suporte cross-platform (Windows, Raspberry Pi, macOS)
try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

app = Flask(__name__)
CORS(app) # Libera acesso para o Electron

# Inicializa o Mediapipe para reconhecimento de mãos
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    static_image_mode=False, 
    max_num_hands=1, 
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)

current_count = 0
current_frame = None
lock = threading.Lock()

# Caminho absoluto para o utilitário OCR nativo do Mac (fallback)
OCR_PATH = "/Users/manoelgoncalo/.gemini/antigravity-ide/brain/94a3a46d-01a4-46b2-be76-4bb94970fbdb/scratch/ocr"
TEMP_FRAME_PATH = "/Users/manoelgoncalo/Downloads/packinghouse-web/scratch/current_frame.jpg"

def analyze_box_ocr(frame):
    output = ""
    used_engine = "NONE"

    # 1. Tenta usar o Pytesseract (Windows / Raspberry Pi / Mac com Tesseract instalado)
    if HAS_PYTESSERACT:
        try:
            # Em sistemas Windows, se o executável do tesseract não estiver no PATH,
            # o desenvolvedor pode descomentar a linha abaixo para apontar para o executável:
            # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            output = pytesseract.image_to_string(img_rgb)
            used_engine = "TESSERACT"
        except Exception as e:
            print(f"⚠️ Pytesseract falhou (verifique se o executável do Tesseract-OCR está instalado): {e}")

    # 2. Se o Pytesseract falhar ou não estiver disponível, tenta o OCR nativo do Mac se estiver em macOS
    if not output.strip() and sys.platform == "darwin":
        if os.path.exists(OCR_PATH):
            # Salva o frame temporariamente em arquivo
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
    detected_weight = 0
    # Procura por peso explícito (ex: "13KG", "15 KG", etc.)
    for w in [18, 16, 15, 13, 10, 5]:
        if f"{w}KG" in output_upper or f"{w} KG" in output_upper or f" {w} KG" in output_upper:
            detected_weight = w
            break
            
    detected_model = "NÃO IDENTIF."
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
            
    return detected_model, detected_weight

def count_fingers(results, frame):
    if not results.multi_hand_landmarks:
        cv2.putText(frame, "AGUARDANDO MAO...", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return 0, frame
    
    landmarks = results.multi_hand_landmarks[0].landmark
    fingers = []
    
    # Lógica para o Polegar
    if landmarks[4].x < landmarks[3].x:
        fingers.append(1)
    else:
        fingers.append(0)
        
    # Lógica para os outros 4 dedos
    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]
    for tip, pip in zip(tips, pips):
        if landmarks[tip].y < landmarks[pip].y:
            fingers.append(1)
        else:
            fingers.append(0)
            
    count = sum(fingers)
    
    # Desenhar esqueleto e o resultado na imagem
    mp_drawing.draw_landmarks(frame, results.multi_hand_landmarks[0], mp_hands.HAND_CONNECTIONS)
    
    # Cria uma caixa de fundo para o texto
    cv2.rectangle(frame, (5, 10), (350, 70), (0, 0, 0), -1)
    cv2.putText(frame, f"CALIBRE: {count}", (15, 55), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
    
    return count, frame

def video_loop():
    global current_count, current_frame
    
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
            
        # Converte para RGB para o Mediapipe
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)
        
        # Pega a contagem e desenha no frame
        count, annotated_frame = count_fingers(results, frame)
        
        with lock:
            current_count = count
            current_frame = annotated_frame.copy()
            
        time.sleep(0.03) # Limita a ~30 fps para não usar muita CPU


last_box_model = "NÃO IDENTIF."
last_detected_weight = 0

def ocr_worker():
    global last_box_model, last_detected_weight
    while True:
        frame_copy = None
        with lock:
            if current_frame is not None:
                frame_copy = current_frame.copy()
            
        if frame_copy is not None:
            try:
                model, weight = analyze_box_ocr(frame_copy)
                if model != "NÃO IDENTIF.":
                    with lock:
                        last_box_model = model
                        last_detected_weight = weight
            except Exception as e:
                print(f"⚠️ Erro na thread de OCR: {e}")
        # Roda OCR a cada 800ms em segundo plano para não pesar a CPU
        time.sleep(0.8)

@app.route('/analyze', methods=['POST'])
def analyze():
    with lock:
        count = current_count
        box_model = last_box_model
        detected_weight = last_detected_weight
        
    print(f"✅ Análise instantânea solicitada. Retornando calibre: {count} | Caixa: {box_model} | Peso: {detected_weight}")
    
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

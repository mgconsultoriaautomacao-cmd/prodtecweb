import cv2
import mediapipe as mp
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import threading
import time

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

def count_fingers(results, frame):
    if not results.multi_hand_landmarks:
        # Se não detectar mãos, limpa a tela de info
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
    
    # Abre a câmera (0 é a padrão do Mac)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ ERRO: Não foi possível abrir a câmera. Verifique se ela está sendo usada por outro app ou se as permissões foram concedidas ao Terminal.")
        return

    print("✅ Câmera aberta com sucesso!")
    
    # Define uma resolução leve para não pesar
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ Falha ao capturar frame (câmera ocupada?)")
            time.sleep(0.5)
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

@app.route('/analyze', methods=['POST'])
def analyze():
    with lock:
        count = current_count
        
    print(f"✅ Análise solicitada. Retornando calibre atual: {count}")
    
    return jsonify({
        "ok": True,
        "caliber": f"CALIBRE {count}" if count > 0 else "NÃO IDENTIF.",
        "count": count,
        "confidence": 0.95 if count > 0 else 0.0
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
    print("🤖 SERVIÇO DE VISÃO COMPUTACIONAL ATIVO (MODO STREAMING)")
    print("📡 Aguardando comandos em: http://localhost:5000/analyze")
    print("🎥 Stream visual em: http://localhost:5000/video_feed")
    print("="*50 + "\n")
    
    # Inicia a API Flask em uma thread separada
    api_thread = threading.Thread(target=lambda: app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False), daemon=True)
    api_thread.start()
    
    # O macOS exige que o acesso à câmera (cv2.VideoCapture) seja feito na MAIN THREAD
    # Portanto, rodamos o video_loop no fluxo principal do script.
    video_loop()

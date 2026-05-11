import cv2
import mediapipe as mp
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Inicializa o MediaPipe para detecção de mãos
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False, 
    max_num_hands=2, 
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Abre a câmera nativa do Mac (0)
cap = cv2.VideoCapture(0)

def count_fingers(hand_landmarks, hand_label):
    # Índices dos dedos: Indicador, Médio, Anelar, Mínimo
    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]
    count = 0
    
    # Verifica os 4 dedos (se a ponta está acima da junta)
    for i in range(4):
        if hand_landmarks.landmark[tips[i]].y < hand_landmarks.landmark[pips[i]].y:
            count += 1
            
    # Lógica simples para o dedão dependendo se é mão esquerda ou direita
    if hand_label == "Right":
        if hand_landmarks.landmark[4].x < hand_landmarks.landmark[3].x:
            count += 1
    else:
        if hand_landmarks.landmark[4].x > hand_landmarks.landmark[3].x:
            count += 1
            
    return count

@app.route('/caliber', methods=['GET'])
def get_caliber():
    if not cap.isOpened():
        return jsonify({"error": "Câmera não encontrada"}), 500
        
    # Limpa o buffer para pegar a foto mais recente e não uma antiga presa na memória
    for _ in range(5):
        cap.read()
        
    success, image = cap.read()
    if not success:
        return jsonify({"error": "Falha ao ler a câmera"}), 500
        
    # O OpenCV usa BGR, mas o MediaPipe precisa de RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(image_rgb)
    
    total_fingers = 0
    
    if results.multi_hand_landmarks and results.multi_handedness:
        for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
            label = handedness.classification[0].label
            total_fingers += count_fingers(hand_landmarks, label)
            
    # Se levantou 5 dedos ou mais, simulamos uma caixa Grande, senão Média ou Pequena
    box_type = "Pequena"
    if total_fingers >= 5:
        box_type = "Grande"
    elif total_fingers >= 3:
        box_type = "Média"
            
    return jsonify({
        "caliber": total_fingers,
        "box_type": box_type,
        "success": True
    })

if __name__ == '__main__':
    print("🤖 Serviço de Visão Computacional Rodando na Porta 5000!")
    print("Mostre os dedos para a câmera do Mac e acesse a integração via Web.")
    app.run(port=5000, debug=False)

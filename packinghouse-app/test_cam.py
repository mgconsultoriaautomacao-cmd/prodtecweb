import cv2
print("Testing cameras...")
for i in range(4):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        print(f"Camera {i}: OPENED - Frame Read: {ret}")
        if ret:
            print(f"Frame shape: {frame.shape}")
        cap.release()
    else:
        print(f"Camera {i}: FAILED to open")

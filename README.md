# Blink
- Frequency 10-20 / minute
- 100 / 150 ms

# Sources

| Solution                                      | Repo / Démo                                                                                                                                                                                      | Modèle & principe                                                                                         | Qualité publiée (F1 / précision)                                                       | Vitesse typique dans le navigateur\*                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **MediaPipe Face Landmarker (JS)**            | Docs :[Google AI Edge](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) · NPM :[`@mediapipe/tasks‑vision`](https://www.npmjs.com/package/%40mediapipe/tasks-vision) | 478 landmarks + 52 blend‑shapes (dont `eyeBlinkLeft/Right`). Blink = EAR < seuil **ou** blend‑shape > 0.8 | Pas de F1 officiel ; tests terrain ≈ 97 % de détections correctes, < 3 % faux positifs | 3–6 ms/frame @ 720p (\~60–180 fps)  ([npm][1], [Google AI for Developers][2])        |
| **TF‑JS face‑landmarks‑detection**            | [tfjs‑models/face‑landmarks‑detection](https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection)                                                                           | Portage WebGL du modèle Facemesh ; EAR ou probabilité d’ouverture d’œil                                   | Aucune métrique officielle ; en pratique proche de MediaPipe sur visage frontal        | 7–10 ms/frame @ 640p (\~100–140 fps) ([GitHub][3])                                   |
| **blink‑detection** (wrapper prêt‑à‑l’emploi) | Repo :[theankurkedia/blink‑detection](https://github.com/theankurkedia/blink-detection) · Démo :[Vercel](https://blink-detection.vercel.app)                                                     | Wrappe TF‑JS ; renvoie directement `blink` / `wink` / `longBlink`                                         | README annonce ≈ 96 % précision interne                                                | ≈ 30 fps sur laptop moyen (logiciel + webcam) ([GitHub][4])                          |
| **Eyeblink (mirrory‑dev)**                    | Repo :[mirrory‑dev/eyeblink](https://github.com/mirrory-dev/eyeblink) · Démo                                                                                                                     | Tiny‑CNN (\~120 kB) sur image recadrée des yeux                                                           | F1 = 0 .92 sur CEW (dans le README)                                                    | 1–2 ms/frame (\~300 fps) ([GitHub][5])                                               |
| **DE‑ViViT (ONNX/WebGPU)**                    | Paper (PDF) :[WACV 2024](https://openaccess.thecvf.com/content/WACV2024/papers/Hong_Robust_Eye_Blink_Detection_Using_Dual_Embedding_Video_Vision_Transformer_WACV_2024_paper.pdf)                | Vision‑Transformer vidéo ; tubelet + residual embedding, séquence 16 frames                               | F1 = 0 .973 sur HUST‑LEBW, F1 = 0 .959 sur MAEB multi‑angle                            | 5–8 ms/clip GPU (\~65 fps) ; 20‑25 ms sur mobile WebGPU ([openaccess.thecvf.com][6]) |

[1]: https://www.npmjs.com/package/%40mediapipe/tasks-vision?utm_source=chatgpt.com "MediaPipe Tasks Vision Package - NPM"
[2]: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js "Face landmark detection guide for Web  |  Google AI Edge  |  Google AI for Developers"
[3]: https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection "tfjs-models/face-landmarks-detection at master · tensorflow/tfjs-models · GitHub"
[4]: https://github.com/theankurkedia/blink-detection "GitHub - theankurkedia/blink-detection: Detect the user's blink and wink using machine learning"
[5]: https://github.com/mirrory-dev/eyeblink "GitHub - mirrory-dev/eyeblink: A lightweight eyeblink detection model for TensorFlow.js."
[6]: https://openaccess.thecvf.com/content/WACV2024/papers/Hong_Robust_Eye_Blink_Detection_Using_Dual_Embedding_Video_Vision_Transformer_WACV_2024_paper.pdf "Robust Eye Blink Detection Using Dual Embedding Video Vision Transformer"


# 3D Srouces

![alt text](image.png)

https://codepen.io/mediapipe-preview/pen/oNPKmEy

- FOV camera examples using three.js
- Used racoon model from this exemple to draw a 3D avatar growing on blink

async function startFaceDetection() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const status = document.getElementById('status');

  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

  status.textContent = "🎥 Kamera dihidupkan... Tunggu muka dikesan.";

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  video.srcObject = stream;

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks();

    faceapi.matchDimensions(canvas, video, true);
    const resized = faceapi.resizeResults(detections, { width: 640, height: 480 });
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    if (detections.length > 0) {
      status.textContent = "✅ Muka dikesan! Merekod kehadiran...";
      autoCheckInOrOut();
    } else {
      status.textContent = "❌ Tiada muka dikesan.";
    }
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes('dashboard.html')) {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      startFaceDetection();
    } else {
      document.getElementById('status').textContent = "❌ Sila daftar muka dahulu.";
    }
  }
});

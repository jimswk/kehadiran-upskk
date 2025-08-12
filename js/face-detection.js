let isFaceDetected = false;

async function startFaceDetection() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const status = document.getElementById('status');

  try {
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

      isFaceDetected = detections.length > 0;
      status.textContent = isFaceDetected
        ? "✅ Muka dikesan! Anda boleh check-in."
        : "❌ Tiada muka dikesan. Hadapkan muka ke kamera.";

      document.getElementById('checkInBtn').disabled = !isFaceDetected;
      document.getElementById('checkOutBtn').disabled = !isFaceDetected;

    }, 500);

  } catch (err) {
    status.innerHTML = `❌ Ralat: ${err.message}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes('dashboard.html')) {
    startFaceDetection();
    document.getElementById('checkInBtn').addEventListener('click', () => recordAttendance('Check-In'));
    document.getElementById('checkOutBtn').addEventListener('click', () => recordAttendance('Check-Out'));
  }
});

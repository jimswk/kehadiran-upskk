let userIdCounter = 1;

// Auto-generate ID
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    document.getElementById('name').value = user.name;
    document.getElementById('autoId').textContent = user.staffId;
    document.getElementById('registerBtn').disabled = true;
    document.getElementById('status').textContent = "✅ Anda sudah berdaftar.";
  }
});

async function startRegistration() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const status = document.getElementById('status');
  const registerBtn = document.getElementById('registerBtn');

  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

  status.textContent = "🎥 Kamera dihidupkan... Hadapkan muka ke kamera.";

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  video.srcObject = stream;

  registerBtn.onclick = async () => {
    const name = document.getElementById('name').value.trim();
    if (!name) {
      alert("Sila masukkan nama.");
      return;
    }

    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      alert("❌ Gagal kesan muka. Cuba lagi.");
      return;
    }

    // Auto-generate ID
    const staffId = `UPSKK${userIdCounter.toString().padStart(3, '0')}`;
    userIdCounter++;

    const userData = { name, staffId };

    // Simpan ke Firebase & localStorage
    await db.collection('registeredUsers').doc(staffId).set({
      name,
      staffId,
      descriptor: Array.from(detection.descriptor),
      registeredAt: new Date()
    });

    localStorage.setItem('user', JSON.stringify(userData));
    document.getElementById('autoId').textContent = staffId;
    registerBtn.disabled = true;
    status.textContent = `✅ Berjaya! ID: ${staffId}`;

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
  };

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
    faceapi.matchDimensions(canvas, video);
    const resized = faceapi.resizeResults(detections, { width: 640, height: 480 });
    faceapi.draw.drawDetections(canvas, resized);
  }, 500);
}

document.addEventListener("DOMContentLoaded", startRegistration);

let currentUser = null;

window.onload = () => {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) {
    alert("Sila daftar muka dahulu.");
    window.location.href = 'index.html';
    return;
  }

  currentUser = JSON.parse(savedUser);
  document.getElementById('userInfo').textContent = `Nama: ${currentUser.name} | ID: ${currentUser.staffId}`;
  document.getElementById('generatePdfBtn').disabled = false;

  loadLogs();
};

function autoCheckInOrOut() {
  if (!currentUser) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const office = { lat: 1.547828, lng: 110.343048 };
    const distance = calculateDistance(latitude, longitude, office.lat, office.lng);

    if (distance > 50) {
      document.getElementById('status').textContent = `❌ Terlalu jauh dari pejabat (${distance.toFixed(0)}m)`;
      return;
    }

    // Semak rekod hari ini
    const docId = `${currentUser.staffId}_${today}`;
    const docRef = db.collection('attendance').doc(docId);

    const doc = await docRef.get();
    const type = doc.exists && doc.data().type === 'Check-In' ? 'Check-Out' : 'Check-In';

    await docRef.set({
      name: currentUser.name,
      staffId: currentUser.staffId,
      type,
      date: today,
      time: now.toLocaleTimeString('ms-MY'),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      latitude,
      longitude,
      distance: `${distance.toFixed(0)}m`
    }, { merge: true });

    document.getElementById('status').textContent = `✅ ${type} berjaya: ${now.toLocaleTimeString('ms-MY')}`;
    loadLogs();

    // Elak rekod berulang
    await new Promise(r => setTimeout(r, 5000));
  }, (err) => {
    console.error("Lokasi gagal:", err);
  }, { timeout: 10000 });
}

async function loadLogs() {
  if (!currentUser) return;

  const snapshot = await db.collection('attendance')
    .where('staffId', '==', currentUser.staffId)
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get();

  const logList = document.getElementById('logList');
  logList.innerHTML = '';

  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = `[${data.type}] ${data.date} ${data.time} | ${data.distance}`;
    logList.appendChild(li);
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

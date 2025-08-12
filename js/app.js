const db = firebase.firestore();
let currentUser = null;

window.onload = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = JSON.parse(userStr);
  document.getElementById('userInfo').textContent = `Hai, ${currentUser.name} (ID: ${currentUser.staffId})`;
  loadLogs();
};

function recordAttendance(type) {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const office = { lat: 1.547828, lng: 110.343048 };
    const distance = calculateDistance(latitude, longitude, office.lat, office.lng);

    if (distance > 50) {
      alert(`❌ Anda berada ${distance.toFixed(0)}m dari pejabat. Had: 50m`);
      return;
    }

    const now = new Date();
    const docId = `${currentUser.staffId}_${now.toISOString().split('T')[0]}`;

    await db.collection('attendance').doc(docId).set({
      name: currentUser.name,
      staffId: currentUser.staffId,
      type,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ms-MY'),
      latitude,
      longitude,
      distance: `${distance.toFixed(0)}m`
    }, { merge: true });

    alert(`${type} berjaya!`);
    loadLogs();
  }, (err) => {
    alert("Gagal dapat lokasi: " + err.message);
  }, { timeout: 10000 });
}

async function loadLogs() {
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

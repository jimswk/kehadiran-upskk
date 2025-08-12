const db = firebase.firestore();
let currentUser = null;

window.onload = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = JSON.parse(userStr);
  document.getElementById('userInfo').textContent = `Hai, ${currentUser.name} (ID: ${currentUser.staffId}) | Shift: ${getShiftTime(currentUser.shift)}`;
  loadLogs();
};

function getShiftTime(shift) {
  const times = {
    "7:30": "7:30-4:30",
    "8:00": "8:00-5:00",
    "8:30": "8:30-5:30"
  };
  return times[shift] || "8:00-5:00";
}

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
  const snapshot = await

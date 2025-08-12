// Initialize Firebase (Ganti dengan config anda)
const firebaseConfig = {
  apiKey: "AIzaSyAB1Lqs-9EHLFI-pnMnKwyHYogNNQq7F8A",
  authDomain: "kehadiran-upskk.firebaseapp.com",
  projectId: "kehadiran-upskk",
  storageBucket: "kehadiran-upskk.firebasestorage.app",
  messagingSenderId: "705500257324",
  appId: "1:705500257324:web:692f800a74a2f8c3d18589",
  measurementId: "G-FKGN5NLLTK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const staffId = document.getElementById('staffId').value.trim();
  const shift = document.getElementById('shift').value;

  if (!name || !staffId) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = "Sila isi semua medan.";
    return;
  }

  localStorage.setItem('user', JSON.stringify({ name, staffId, shift, department: 'UPSKK' }));
  window.location.href = 'dashboard.html';
});

// Initialize Firebase (Ganti dengan config anda)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const staffId = document.getElementById('staffId').value.trim();

  if (!name || !staffId) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = "Sila isi semua medan.";
    return;
  }

  localStorage.setItem('user', JSON.stringify({ name, staffId }));
  window.location.href = 'dashboard.html';
});

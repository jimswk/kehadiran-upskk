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
const auth = firebase.auth();
const db = firebase.firestore();

const OFFICE_LAT = 1.548;  // Approximate from public data
const OFFICE_LNG = 110.345;
const RADIUS = 100;  // meters

let video, canvas, context, userShift;

// Load face-api models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models')
]).then(() => console.log('Models loaded'));

async function startVideo() {
  video = document.getElementById('video');
  canvas = document.getElementById('canvas');
  context = canvas.getContext('2d');
  navigator.mediaDevices.getUserMedia({ video: {} }).then(stream => {
    video.srcObject = stream;
  });
}

async function registerUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value;
  userShift = document.getElementById('shift').value;
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(userCredential.user.uid).set({
      name, shift: userShift
    });
    alert('User registered. Now register face.');
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('face-section').style.display = 'block';
    startVideo();
  } catch (error) {
    alert(error.message);
  }
}

async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
    userShift = userDoc.data().shift;
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('face-section').style.display = 'block';
    startVideo();
  } catch (error) {
    alert(error.message);
  }
}

async function registerFace() {
  const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if (detections) {
    const descriptor = detections.descriptor;
    await db.collection('users').doc(auth.currentUser.uid).update({
      faceDescriptor: Array.from(descriptor)
    });
    alert('Face registered successfully.');
  } else {
    alert('No face detected. Try again.');
  }
}

async function clockInOut(type) {
  const user = auth.currentUser;
  if (!user) return alert('Login first.');

  const userDoc = await db.collection('users').doc(user.uid).get();
  const registeredDescriptor = new Float32Array(userDoc.data().faceDescriptor);

  const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if (!detections) return alert('No face detected.');

  const distance = faceapi.euclideanDistance(registeredDescriptor, detections.descriptor);
  if (distance > 0.6) return alert('Face does not match.');

  // Location check
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const dist = haversine(OFFICE_LAT, OFFICE_LNG, lat, lng);
    if (dist > RADIUS) return alert('Not at office location.');

    const now = new Date().toISOString();
    await db.collection('attendance').add({
      userId: user.uid,
      type, time: now, lat, lng
    });
    alert(`Clock ${type} successful at ${now}.`);
  }, err => alert('Location error: ' + err.message));
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateQR() {
  const user = auth.currentUser;
  if (!user) return;
  const qrData = `checkin:${user.uid}:${Date.now()}`;  // Unique per session
  QRCode.toCanvas(document.createElement('canvas'), qrData, (err, canvas) => {
    if (err) return;
    document.getElementById('qr-container').appendChild(canvas);
  });
}

async function scanQR() {
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (code) {
    // Validate QR data and clock in/out (simple: assume scan means in/out toggle)
    // For production, parse code.data and verify
    alert('QR scanned: ' + code.data);
    // Add logic to record attendance similar to clockInOut
    const now = new Date().toISOString();
    await db.collection('attendance').add({
      userId: auth.currentUser.uid,
      type: 'qr', time: now
    });
  } else {
    alert('No QR detected. Try again.');
  }
}

async function generateReport() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  const name = userDoc.data().name;
  const shift = userShift.split('-');  // e.g., ['7:30', '16:30']
  const startHour = parseInt(shift[0].split(':')[0]);
  const startMin = parseInt(shift[0].split(':')[1]);
  const endHour = parseInt(shift[1].split(':')[0]);
  const endMin = parseInt(shift[1].split(':')[1]);

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const attendanceDocs = await db.collection('attendance').where('userId', '==', user.uid)
    .where('time', '>=', startDate).where('time', '<=', endDate + 'T23:59:59').get();

  const data = {};  // Group by date: {date: {in: time, out: time}}
  attendanceDocs.forEach(doc => {
    const d = doc.data();
    const date = d.time.split('T')[0];
    if (!data[date]) data[date] = {};
    if (d.type === 'in') data[date].in = new Date(d.time);
    if (d.type === 'out') data[date].out = new Date(d.time);
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Monthly Attendance Report for ${name}`, 10, 10);
  doc.text(`Period: ${startDate} to ${endDate}`, 10, 20);
  doc.text(`Shift: ${shift[0]}am - ${shift[1]}pm`, 10, 30);

  let y = 40;
  let totalHours = 0, totalOT = 0;
  Object.keys(data).sort().forEach(date => {
    const entry = data[date];
    if (!entry.in || !entry.out) return;

    const inTime = entry.in;
    const outTime = entry.out;
    const hours = (outTime - inTime) / (1000 * 60 * 60);
    const scheduledStart = new Date(inTime).setHours(startHour, startMin, 0);
    const scheduledEnd = new Date(outTime).setHours(endHour, endMin, 0);
    const ot = Math.max(0, (outTime - scheduledEnd) / (1000 * 60 * 60));

    totalHours += hours;
    totalOT += ot;

    // Colors: Use text color for red
    const inStr = inTime.toLocaleTimeString();
    const outStr = outTime.toLocaleTimeString();
    const inColor = inTime > scheduledStart ? 'red' : 'black';
    const outColor = outTime < scheduledEnd ? 'red' : 'black';

    doc.setTextColor(inColor === 'red' ? [255, 0, 0] : [0, 0, 0]);
    doc.text(`Date: ${date} | In: ${inStr}`, 10, y);
    doc.setTextColor(outColor === 'red' ? [255, 0, 0] : [0, 0, 0]);
    doc.text(`Out: ${outStr} | Hours: ${hours.toFixed(2)} | OT: ${ot.toFixed(2)}`, 80, y);
    y += 10;
  });

  doc.text(`Total Hours: ${totalHours.toFixed(2)} | Total OT: ${totalOT.toFixed(2)}`, 10, y + 10);
  doc.save(`attendance_${name}_${startDate}.pdf`);
}

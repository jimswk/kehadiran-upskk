let html5QrcodeScanner;

function initQrScanner() {
  if (document.getElementById('qr-reader').children.length === 0) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader", { fps: 10, qrbox: 250 }, false
    );
    html5QrcodeScanner.render(onScanSuccess);
  }
}

function onScanSuccess(decodedText) {
  if (decodedText === "CHECKIN_UPSKK_BSIK") {
    document.getElementById('qrCheckIn').disabled = false;
    document.getElementById('qrCheckIn').onclick = () => recordAttendance('Check-In (QR)');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes('dashboard.html')) {
    initQrScanner();
  }
});

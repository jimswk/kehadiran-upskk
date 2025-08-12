document.getElementById('generatePdfBtn').addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const pageWidth = doc.internal.pageSize.width;
  const tableStartY = 50;

  // --- DAPATKAN BULAN SEMASA ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startStr = formatDate(new Date(currentYear, currentMonth, 1));
  const endStr = formatDate(new Date(currentYear, currentMonth, lastDay));

  // --- HEADER ---
  doc.setFontSize(18);
  doc.text("Total Time Card", pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Start Date ${startStr} End Date ${endStr}`, pageWidth / 2, 28, { align: 'center' });

  // --- NAMA & JABATAN ---
  doc.setFontSize(11);
  doc.text(`First Name: ${currentUser.name}, Department : ${currentUser.department}`, 14, 40);

  // --- DATA DARI FIREBASE ---
  const snapshot = await db.collection('attendance')
    .where('staffId', '==', currentUser.staffId)
    .where('date', '>=', startStr)
    .where('date', '<=', endStr)
    .orderBy('date')
    .get();

  const attendanceMap = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!attendanceMap[data.date]) {
      attendanceMap[data.date] = {};
    }
    if (data.type.includes('Check-In')) {
      attendanceMap[data.date].in = data.time;
    }
    if (data.type.includes('Check-Out')) {
      attendanceMap[data.date].out = data.time;
    }
  });

  // --- JADUAL DATA ---
  const tableColumn = ["Date", "Weekday", "Clock In", "Clock Out", "Total Hours", "Total OT"];
  const tableRows = [];
  const tableStyles = [];

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const shiftTimes = {
    "7:30": { in: "07:30", out: "16:30" },
    "8:00": { in: "08:00", out: "17:00" },
    "8:30": { in: "08:30", out: "17:30" }
  };

  const { in: stdIn, out: stdOut } = shiftTimes[currentUser.shift] || shiftTimes["8:00"];
  const [stdInH, stdInM] = stdIn.split(':').map(Number);
  const [stdOutH, stdOutM] = stdOut.split(':').map(Number);
  const stdInTotal = stdInH + stdInM / 60;
  const stdOutTotal = stdOutH + stdOutM / 60;

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const d = new Date(currentYear, currentMonth, day);
    const weekday = days[d.getDay()];

    const record = attendanceMap[dateStr] || {};
    const clockIn = record.in || "";
    const clockOut = record.out || "";

    let totalHours = "";
    let ot = "";

    let inStyle = {};
    let outStyle = {};

    if (clockIn && clockOut) {
      const [inH, inM] = clockIn.split(':').map(Number);
      const [outH, outM] = clockOut.split(':').map(Number);

      const inTotal = inH + inM / 60;
      const outTotal = outH + outM / 60;

      let diff = outTotal - inTotal;
      if (diff < 0) diff += 24;

      totalHours = diff.toFixed(2);
      ot = outTotal > stdOutTotal ? (outTotal - stdOutTotal).toFixed(2) : "0.00";

      if (inTotal > stdInTotal) {
        inStyle = { fillColor: [255, 235, 235], textColor: [220, 0, 0] };
      }
      if (outTotal > stdOutTotal) {
        outStyle = { fillColor: [235, 255, 235], textColor: [0, 128, 0] };
      }
    }

    tableRows.push([dateStr, weekday, clockIn, clockOut, totalHours, ot]);
    tableStyles.push([{}, {}, inStyle, outStyle, {}, {}]);
  }

  // Hasilkan jadual
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 },
      3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 }
    },
    didParseCell: (data) => {
      const style = tableStyles[data.row.index]?.[data.column.index];
      if (style) Object.assign(data.cell.styles, style);
    }
  });

  // --- STATISTIK ---
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Statistic", 14, finalY);

  const totalWorkDays = tableRows.filter(r => r[2] !== "").length;
  const totalHoursSum = tableRows.filter(r => r[4] !== "").reduce((a, r) => a + parseFloat(r[4]), 0).toFixed(2);
  const totalOtSum = tableRows.filter(r => r[5] !== "").reduce((a, r) => a + parseFloat(r[5]), 0).toFixed(2);

  doc.setFontSize(10);
  doc.text(`Total Working Days: ${totalWorkDays}`, 14, finalY + 10);
  doc.text(`Total Hours Worked: ${totalHoursSum} hours`, 14, finalY + 16);
  doc.text(`Total OT Hours: ${totalOtSum} hours`, 14, finalY + 22);

  // --- SIMPAN PDF ---
  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(currentYear, currentMonth));
  doc.save(`Laporan_Kehadiran_${currentUser.staffId}_${monthName}${currentYear}.pdf`);
});

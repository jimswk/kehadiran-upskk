document.getElementById('generatePdfBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const startStr = formatDate(new Date(currentYear, currentMonth, 1));
  const endStr = formatDate(new Date(currentYear, currentMonth, lastDay));

  doc.setFontSize(18);
  doc.text("Total Time Card", pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Start Date ${startStr} End Date ${endStr}`, pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`First Name: ${currentUser.name}, Department : UPSKK`, 14, 40);

  const snapshot = await db.collection('attendance')
    .where('staffId', '==', currentUser.staffId)
    .where('date', '>=', startStr)
    .where('date', '<=', endStr)
    .orderBy('date')
    .get();

  const attendanceMap = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    attendanceMap[data.date] = {
      in: data.type === 'Check-In' ? data.time : "",
      out: data.type === 'Check-Out' ? data.time : ""
    };
  });

  const tableColumn = ["Date", "Weekday", "Clock In", "Clock Out", "Total Hours", "Total OT"];
  const tableRows = [];
  const tableStyles = [];

  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const shifts = [
    { in: "07:30", out: "16:30" },
    { in: "08:00", out: "17:00" },
    { in: "08:30", out: "17:30" }
  ];

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const d = new Date(currentYear, currentMonth, day);
    const weekday = days[d.getDay()];

    const record = attendanceMap[dateStr] || { in: "", out: "" };
    const clockIn = record.in;
    const clockOut = record.out;

    let totalHours = "";
    let ot = "";
    let inStyle = {}, outStyle = {};

    if (clockIn && clockOut) {
      const [inH, inM] = clockIn.split(':').map(Number);
      const [outH, outM] = clockOut.split(':').map(Number);
      const inTotal = inH + inM / 60;
      const outTotal = outH + outM / 60;
      let diff = outTotal - inTotal;
      if (diff < 0) diff += 24;
      totalHours = diff.toFixed(2);

      // OT jika lewat waktu tamat
      ot = "0.00";
      for (const s of shifts) {
        const [stdOutH, stdOutM] = s.out.split(':').map(Number);
        const stdOutTotal = stdOutH + stdOutM / 60;
        if (outTotal > stdOutTotal) {
          ot = (outTotal - stdOutTotal).toFixed(2);
          break;
        }
      }

      // Late In
      let late = true;
      for (const s of shifts) {
        const [stdInH, stdInM] = s.in.split(':').map(Number);
        const stdInTotal = stdInH + stdInM / 60;
        if (inTotal <= stdInTotal) {
          late = false;
          break;
        }
      }
      if (late) inStyle = { fillColor: [255, 235, 235], textColor: [220, 0, 0] };

      // Early Out
      let early = true;
      for (const s of shifts) {
        const [stdOutH, stdOutM] = s.out.split(':').map(Number);
        const stdOutTotal = stdOutH + stdOutM / 60;
        if (outTotal >= stdOutTotal) {
          early = false;
          break;
        }
      }
      if (early && clockOut !== "") {
        outStyle = { fillColor: [255, 235, 235], textColor: [220, 0, 0] };
      }
    }

    tableRows.push([dateStr, weekday, clockIn, clockOut, totalHours, ot]);
    tableStyles.push([{}, {}, inStyle, outStyle, {}, {}]);
  }

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 0:{w:30},1:{w:30},2:{w:30},3:{w:30},4:{w:25},5:{w:25} },
    didParseCell: (data) => {
      const style = tableStyles[data.row.index]?.[data.column.index];
      if (style) Object.assign(data.cell.styles, style);
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text("Statistic", 14, finalY);
  const totalWorkDays = tableRows.filter(r => r[2] !== "" && r[3] !== "").length;
  const totalHoursSum = tableRows.filter(r => r[4] !== "").reduce((a,r)=>a+parseFloat(r[4]),0).toFixed(2);
  const totalOtSum = tableRows.filter(r => r[5] !== "").reduce((a,r)=>a+parseFloat(r[5]),0).toFixed(2);
  doc.setFontSize(10);
  doc.text(`Total Working Days: ${totalWorkDays}`, 14, finalY + 10);
  doc.text(`Total Hours Worked: ${totalHoursSum} hours`, 14, finalY + 16);
  doc.text(`Total OT Hours: ${totalOtSum} hours`, 14, finalY + 22);

  const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(currentYear, currentMonth));
  doc.save(`Laporan_Kehadiran_${currentUser.staffId}_${monthName}${currentYear}.pdf`);
});

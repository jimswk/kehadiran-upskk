document.getElementById('generatePdfBtn').addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text("Total Time Card", 105, 20, null, null, 'center');

  doc.setFontSize(12);
  doc.text("Start Date 2025-06-01 End Date 2025-06-30", 105, 30, null, null, 'center');

  // User Info
  doc.text(`First Name: Mohammad Azzer bin Taip, Department : UPSKK`, 14, 40);

  // Table
  const tableColumn = ["Date", "Weekday", "Clock In", "Clock Out", "Total Hours", "Total OT"];
  const tableRows = [];

  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  for (let i = 1; i <= 30; i++) {
    const date = `2025-06-${i.toString().padStart(2, '0')}`;
    const d = new Date(2025, 5, i);
    const weekday = days[d.getDay()];
    tableRows.push([date, weekday, "", "", "", ""]);
  }

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] }
  });

  // Statistik
  const finalY = doc.lastAutoTable.finalY;
  doc.text("Statistic", 14, finalY + 10);

  // Save
  doc.save(`Laporan_Kehadiran_UPSKK_Jun2025.pdf`);
});

// Utility function for PDF export using window.print() with auto-save
export function printToPDF(fileName: string = "simulation-report") {
  // Trigger browser print dialog with filename
  const originalTitle = document.title;
  document.title = fileName;
  
  window.print();
  
  // Restore original title after print
  setTimeout(() => {
    document.title = originalTitle;
  }, 500);
}

// Helper to generate PDF using browser's print-to-PDF
export function preparePDFExport() {
  // This sets up the page for optimal PDF export
  const style = document.createElement("style");
  style.textContent = `
    @media print {
      body * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
  document.head.appendChild(style);
}

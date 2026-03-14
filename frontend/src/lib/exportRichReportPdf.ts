export interface ExportRichReportPdfOptions {
  element: HTMLElement;
  filename: string;
  title: string;
  subtitle?: string;
  brand?: string;
  accentColor?: [number, number, number];
}

export async function exportRichReportPdf({
  element,
  filename,
  title,
  subtitle,
  brand = "Delirium Infinite",
  accentColor = [73, 194, 255],
}: ExportRichReportPdfOptions) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const [r, g, b] = accentColor;

  pdf.setFillColor(9, 17, 26);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(r, g, b);
  pdf.circle(84, 96, 26, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(brand, 126, 84);
  pdf.setFontSize(28);
  pdf.text(title, 48, 152);

  if (subtitle) {
    pdf.setTextColor(195, 210, 224);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    const wrappedSubtitle = pdf.splitTextToSize(subtitle, pageWidth - 96);
    pdf.text(wrappedSubtitle, 48, 184);
  }

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleString("pt-BR"), 48, pageHeight - 48);

  const canvas = await html2canvas(element, {
    backgroundColor: "#09111a",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const image = canvas.toDataURL("image/png");
  const margin = 24;
  const renderWidth = pageWidth - margin * 2;
  const renderHeight = (canvas.height * renderWidth) / canvas.width;
  let currentHeightLeft = renderHeight;
  let positionY = margin;

  pdf.addPage();
  pdf.addImage(
    image,
    "PNG",
    margin,
    positionY,
    renderWidth,
    renderHeight,
    undefined,
    "FAST",
  );
  currentHeightLeft -= pageHeight - margin * 2;

  while (currentHeightLeft > 0) {
    pdf.addPage();
    positionY = margin - (renderHeight - currentHeightLeft);
    pdf.addImage(
      image,
      "PNG",
      margin,
      positionY,
      renderWidth,
      renderHeight,
      undefined,
      "FAST",
    );
    currentHeightLeft -= pageHeight - margin * 2;
  }

  pdf.save(filename);
}

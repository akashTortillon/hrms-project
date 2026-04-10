import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../api/apiClient.js";

const COMPANY_LOGO_MAP = {
  "Rizan Jewellery": "/1710577642_1703923938_Rizan_jewellery.webp",
  "Centriz": "/1710578900_1703769304_centriz.webp",
  "Digitriz": "/1710578900_1703769304_digitriz.webp",
  "City Medicals": "/1710578988_1703924346_citymedicals.webp",
  "Regain": "/1710578988_1703924346_regain.webp",
  "Peak": "/1710579133_1703924042_peak.webp",
  "Rizan Trading": "/1716451857_1703923938_Rizan_trading.png",
  "Puretouch": "/1716451857_1703923982_puretouch.png",
  "Rizan GND": "/1716451857_rizan_gnd.png",
  "Flyriz": "/1722933347_Flyriz-Logo_172X79_pxl-X-1x.png",
  "Elevage": "/1731932446_elevage.png",
  "Silver": "/1743670033_silver-logo.png",
  "Leptis": "/logo-leptis.png",
  "LEPTIS HYPERMARKET LLC": "/logo-leptis.png",
};

const DEFAULT_LOGO = "/1716451857_1703923982_puretouch.png";
const API_BASE = import.meta.env.VITE_API_BASE || "";

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const loadImageAsPngDataUrl = async ({ src, apiPath }) => {
  try {
    let imageSrc = src;

    if (apiPath) {
      const response = await api.get(apiPath.replace(API_BASE, ""), { responseType: "blob" });
      imageSrc = window.URL.createObjectURL(response.data);
    }

    const img = new Image();
    if (!apiPath) {
      img.crossOrigin = "Anonymous";
    }
    img.src = imageSrc;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    if (!img.width || !img.height) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    if (apiPath && imageSrc?.startsWith("blob:")) {
      window.URL.revokeObjectURL(imageSrc);
    }
    return {
      dataUrl,
      width: img.width,
      height: img.height,
    };
  } catch (error) {
    console.error("Failed to normalize logo image", error);
    return null;
  }
};

export const getPayslipBranding = (record, companies = []) => {
  const companyName = record?.employee?.company || "LEPTIS HYPERMARKET LLC";
  const dynamicCompany = companies.find((company) => company.name === companyName);
  const proxiedLogoSrc = dynamicCompany?._id ? `${API_BASE}/masters/companies/${dynamicCompany._id}/logo` : "";
  return {
    companyName,
    companyLogoSrc: dynamicCompany?.image || COMPANY_LOGO_MAP[companyName] || DEFAULT_LOGO,
    companyLogoPdfSrc: proxiedLogoSrc,
  };
};

export const downloadPayslipPdf = async (record, companies = []) => {
  if (!record) return;

  const { employee, basicSalary, allowances, attendanceSummary } = record;
  const { companyName, companyLogoSrc, companyLogoPdfSrc } = getPayslipBranding(record, companies);
  const monthName = record.month
    ? new Date(2000, record.month - 1).toLocaleString("default", { month: "long" })
    : "";
  const periodStr = `${monthName} ${record.year}`;
  const totalAllowances = record.totalAllowances || 0;

  let displayDeductions = [];
  let hiddenAdvanceAmount = 0;
  (record.deductions || []).forEach((item) => {
    if (item.name && item.name.toLowerCase().includes("salary advance")) {
      hiddenAdvanceAmount += Number(item.amount || 0);
    } else {
      displayDeductions.push(item);
    }
  });

  const totalDeductions = (record.totalDeductions || 0) - hiddenAdvanceAmount;
  const grossEarnings = Number(basicSalary || 0) + Number(totalAllowances || 0);

  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

  const cardX = 42;
  const cardY = 40;
  const cardW = pageWidth - 84;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, cardY, cardW, 720, 18, 18, "FD");

  const logoAsset = await loadImageAsPngDataUrl({
    src: companyLogoSrc,
    apiPath: companyLogoPdfSrc || ""
  });

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1.2);
  doc.line(cardX + 28, cardY + 110, cardX + cardW - 28, cardY + 110);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX + 28, cardY + 28, 62, 62, 10, 10, "FD");

  if (logoAsset?.dataUrl) {
    const maxLogoWidth = 40;
    const maxLogoHeight = 40;
    const ratio = Math.min(
      maxLogoWidth / logoAsset.width,
      maxLogoHeight / logoAsset.height
    );
    const logoWidth = logoAsset.width * ratio;
    const logoHeight = logoAsset.height * ratio;
    const logoX = cardX + 39 + ((40 - logoWidth) / 2);
    const logoY = cardY + 39 + ((40 - logoHeight) / 2);
    doc.addImage(logoAsset.dataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(companyName, cardX + 102, cardY + 54);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAYROLL STATEMENT", cardX + 102, cardY + 76);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("SALARY SLIP", cardX + cardW - 28, cardY + 48, { align: "right" });
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Period: ${periodStr}`, cardX + cardW - 28, cardY + 72, { align: "right" });

  const infoBoxX = cardX + 28;
  const infoBoxY = cardY + 136;
  const infoBoxW = cardW - 56;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(infoBoxX, infoBoxY, infoBoxW, 68, 12, 12, "FD");

  const identityItems = [
    ["EMPLOYEE NAME", employee?.name || "N/A"],
    ["EMPLOYEE ID", employee?.code || "N/A"],
    ["DESIGNATION", employee?.designation || "N/A"],
    ["DEPARTMENT", employee?.department || "N/A"],
  ];

  identityItems.forEach(([label, value], index) => {
    const colX = infoBoxX + 16 + index * ((infoBoxW - 32) / 4);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, colX, infoBoxY + 26);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(value), colX, infoBoxY + 48);
  });

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Attendance Summary", cardX + 28, cardY + 240);
  doc.setDrawColor(226, 232, 240);
  doc.line(cardX + 28, cardY + 252, cardX + cardW - 28, cardY + 252);

  const summaryCards = [
    ["Total Days", attendanceSummary?.totalDays || 30, [241, 245, 249], [15, 23, 42]],
    ["Present", attendanceSummary?.daysPresent || 0, [241, 245, 249], [15, 23, 42]],
    ["Absent", attendanceSummary?.daysAbsent || 0, [254, 242, 242], [239, 68, 68]],
  ];

  summaryCards.forEach(([label, value, bg, fg], index) => {
    const boxX = cardX + 28 + index * 116;
    const boxY = cardY + 268;
    doc.setFillColor(...bg);
    doc.roundedRect(boxX, boxY, 96, 58, 8, 8, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, boxX + 14, boxY + 20);
    doc.setTextColor(...fg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(String(value), boxX + 14, boxY + 43);
  });

  const leftTableX = cardX + 28;
  const tableY = cardY + 352;
  const tableWidth = (cardW - 68) / 2;
  const rightTableX = leftTableX + tableWidth + 12;

  autoTable(doc, {
    startY: tableY,
    margin: { left: leftTableX, right: pageWidth - leftTableX - tableWidth },
    head: [["EARNINGS", "AMOUNT"]],
    body: [
      ["Basic Salary", formatAmount(basicSalary)],
      ...((allowances || []).map((item) => [item.name, formatAmount(item.amount)])),
      [
        { content: "Total Earnings", styles: { fontStyle: "bold", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
        { content: formatAmount(grossEarnings), styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 11,
      cellPadding: { top: 9, right: 12, bottom: 9, left: 12 },
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 1 },
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      1: { halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
    },
  });

  autoTable(doc, {
    startY: tableY,
    margin: { left: rightTableX, right: pageWidth - rightTableX - tableWidth },
    head: [["DEDUCTIONS", "AMOUNT"]],
    body: displayDeductions.length > 0
      ? [
          ...displayDeductions.map((item) => [item.name, formatAmount(item.amount)]),
          [
            { content: "Total Deductions", styles: { fontStyle: "bold", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
            { content: formatAmount(totalDeductions), styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
          ],
        ]
      : [
          [{ content: "No deductions", colSpan: 2, styles: { halign: "center", textColor: [148, 163, 184], fontStyle: "italic" } }],
          [
            { content: "Total Deductions", styles: { fontStyle: "bold", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
            { content: formatAmount(totalDeductions), styles: { fontStyle: "bold", halign: "right", fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
          ],
        ],
    theme: "plain",
    styles: {
      fontSize: 11,
      cellPadding: { top: 9, right: 12, bottom: 9, left: 12 },
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 1 },
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      1: { halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
    },
  });

  const netCardY = Math.max(doc.lastAutoTable.finalY, tableY + 150) + 22;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(cardX + 28, netCardY, cardW - 56, 64, 12, 12, "FD");
  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NET SALARY PAYABLE", cardX + 48, netCardY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Final payout after deductions", cardX + 48, netCardY + 46);
  doc.setTextColor(20, 83, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${formatAmount(record.netSalary)} AED`, cardX + cardW - 48, netCardY + 38, { align: "right" });

  const signatureY = netCardY + 106;
  doc.setDrawColor(148, 163, 184);
  doc.line(cardX + 56, signatureY, cardX + 196, signatureY);
  doc.line(cardX + cardW - 196, signatureY, cardX + cardW - 56, signatureY);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("EMPLOYEE SIGNATURE", cardX + 126, signatureY + 16, { align: "center" });
  doc.text("EMPLOYER SIGNATURE", cardX + cardW - 126, signatureY + 16, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("This is a computer-generated payslip.", pageWidth / 2, signatureY + 48, { align: "center" });

  const safeName = String(employee?.name || "Employee").replace(/[^a-z0-9_-]+/gi, "_");
  doc.save(`Payslip_${safeName}_${monthName}_${record.year}.pdf`);
};

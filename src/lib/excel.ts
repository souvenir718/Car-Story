"use client";

import ExcelJS from "exceljs";
import type { AppSettings, DriveLog, FuelLog } from "./types";

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
};

const toDateText = (date: string) => date.replaceAll("-", ".");

const applyHeaderStyle = (worksheet: ExcelJS.Worksheet) => {
  worksheet.getRow(2).font = { bold: true };
  worksheet.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });
  });
};

const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const exportDriveLogs = async (
  logs: DriveLog[],
  settings: AppSettings,
  month: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("운행일지");

  worksheet.mergeCells("A1:O1");
  worksheet.getCell("A1").value = `${monthLabel(month)} 차량운행 및 정비일지`;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.columns = [
    { key: "year", width: 6 },
    { key: "month", width: 6 },
    { key: "day", width: 6 },
    { key: "passengerName", width: 14 },
    { key: "passengerCount", width: 9 },
    { key: "destination", width: 24 },
    { key: "purpose", width: 16 },
    { key: "startTime", width: 10 },
    { key: "endTime", width: 10 },
    { key: "startOdometer", width: 10 },
    { key: "endOdometer", width: 10 },
    { key: "distance", width: 10 },
    { key: "memo", width: 28 },
    { key: "driverSignature", width: 12 },
    { key: "managerCheck", width: 12 },
  ];
  worksheet.getRow(2).values = [
    "년",
    "월",
    "일",
    "사용자",
    "탑승 인원",
    "행선지",
    "목적",
    "출발 시간",
    "도착 시간",
    "출발 km",
    "도착 km",
    "주행거리",
    "차량정비내용/비고",
    "운전자 서명",
    "관리자 확인",
  ];

  logs.forEach((log) => {
    worksheet.addRow({
      year: Number(log.date.slice(0, 4)),
      month: Number(log.date.slice(5, 7)),
      day: Number(log.date.slice(8, 10)),
      passengerName: log.passengerName,
      passengerCount: log.passengerCount,
      destination: log.destination,
      purpose: log.purpose,
      startTime: log.startTime,
      endTime: log.endTime,
      startOdometer: log.startOdometer,
      endOdometer: log.endOdometer,
      distance: log.distance,
      memo: log.memo,
      driverSignature: settings.driverName,
      managerCheck: "",
    });
  });

  applyHeaderStyle(worksheet);
  await downloadWorkbook(workbook, `${monthLabel(month)}_차량운행_및_정비일지.xlsx`);
};

export const exportFuelLogs = async (
  logs: FuelLog[],
  settings: AppSettings,
  month: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("유류수불대장");

  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value = `${monthLabel(month)} 유류수불대장`;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  worksheet.columns = [
    { key: "index", width: 8 },
    { key: "date", width: 14 },
    { key: "fuelAmount", width: 16 },
    { key: "amount", width: 16 },
    { key: "odometer", width: 14 },
    { key: "memo", width: 20 },
    { key: "driverName", width: 12 },
    { key: "director", width: 12 },
  ];
  worksheet.getRow(2).values = [
    "연번",
    "일자",
    "주유량",
    "금액",
    "주행총거리",
    "비고",
    "담당",
    "시설장",
  ];

  logs.forEach((log, index) => {
    worksheet.addRow({
      index: index + 1,
      date: toDateText(log.date),
      fuelAmount: `${log.fuelAmount.toLocaleString()} 리터`,
      amount: `${log.amount.toLocaleString()}원`,
      odometer: `${log.odometer.toLocaleString()}km`,
      memo: log.memo,
      driverName: settings.driverName,
      director: "",
    });
  });

  applyHeaderStyle(worksheet);
  await downloadWorkbook(workbook, `${monthLabel(month)}_유류수불대장.xlsx`);
};

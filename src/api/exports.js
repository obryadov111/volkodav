import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../supabase";
import { getSnapshotById, getSnapshotChecks } from "./snapshots";

const EXPORT_BUCKET = "audit-exports";

function safeFilePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildStoragePath(snapshot, extension) {
  const orgId = snapshot.organization_id;
  const snapshotId = snapshot.id;
  const scanNumber = snapshot.scan_number ?? "unknown";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  return `organizations/${orgId}/snapshots/${snapshotId}/scan_${scanNumber}_${stamp}.${extension}`;
}

function buildExportRows(checks) {
  return checks.map((item) => ({
    Актив: item.asset?.hostname || "—",
    IP: item.asset?.ip_address || "—",
    ОС: item.asset?.os || "—",
    Тип_актива: item.asset?.asset_type || "—",
    Criticality: item.asset?.criticality || "—",
    Код_правила: item.rule?.rule_code || "—",
    Правило: item.rule?.title || "—",
    Severity: item.rule?.severity || "—",
    Actual: item.actual_value || "—",
    Expected:
      item.expected_value ||
      item.rule?.expected_value ||
      "—",
    Status: item.status || "—",
    Checked_at: item.checked_at || "—",
    Source: item.rule?.source || "—",
    Remediation: item.rule?.remediation || "—",
  }));
}

async function uploadBlob(path, blob, contentType) {
  const { error } = await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType,
    });

  if (error) {
    throw error;
  }
}

async function saveExportPath(snapshotId, format, path) {
  const patch =
    format === "pdf"
      ? { exported_pdf_path: path }
      : { exported_excel_path: path };

  const { error } = await supabase
    .from("scan_snapshots")
    .update(patch)
    .eq("id", snapshotId);

  if (error) {
    throw error;
  }
}

export async function getSnapshotExportDownloadUrl(path, expiresIn = 60) {
  const { data, error } = await supabase.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

async function generatePdfBlob(snapshot, checks) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const title = `Volkodav Audit Report — Snapshot #${snapshot.scan_number}`;
  const subtitle = [
    `Дата: ${snapshot.created_at?.slice(0, 19).replace("T", " ") || "—"}`,
    `Checks: ${snapshot.total_checks ?? 0}`,
    `Passed: ${snapshot.passed ?? 0}`,
    `Failed: ${snapshot.failed ?? 0}`,
    `Score: ${snapshot.compliance_score != null ? `${Math.round(snapshot.compliance_score)}%` : "—"}`,
  ].join("   |   ");

  doc.setFontSize(18);
  doc.text(title, 40, 40);

  doc.setFontSize(10);
  doc.text(subtitle, 40, 60);

  const body = checks.map((item) => [
    item.asset?.hostname || "—",
    item.rule?.rule_code || "—",
    item.rule?.title || "—",
    item.rule?.severity || "—",
    item.actual_value || "—",
    item.expected_value || item.rule?.expected_value || "—",
    item.status || "—",
  ]);

  autoTable(doc, {
    startY: 80,
    head: [[
      "Актив",
      "Код",
      "Правило",
      "Severity",
      "Actual",
      "Expected",
      "Status",
    ]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [35, 35, 35],
      textColor: 255,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 30, right: 30 },
  });

  return doc.output("blob");
}

async function generateExcelBlob(snapshot, checks) {
  const workbook = XLSX.utils.book_new();

  const metaRows = [
    { Параметр: "Snapshot ID", Значение: snapshot.id },
    { Параметр: "Scan number", Значение: snapshot.scan_number ?? "—" },
    { Параметр: "Created at", Значение: snapshot.created_at || "—" },
    { Параметр: "Total checks", Значение: snapshot.total_checks ?? 0 },
    { Параметр: "Passed", Значение: snapshot.passed ?? 0 },
    { Параметр: "Failed", Значение: snapshot.failed ?? 0 },
    { Параметр: "Compliance score", Значение: snapshot.compliance_score ?? "—" },
    { Параметр: "Notes", Значение: snapshot.notes || "—" },
  ];

  const checksRows = buildExportRows(checks);

  const metaSheet = XLSX.utils.json_to_sheet(metaRows);
  const checksSheet = XLSX.utils.json_to_sheet(checksRows);

  XLSX.utils.book_append_sheet(workbook, metaSheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, checksSheet, "Checks");

  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob(
    [arrayBuffer],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );
}

export async function generateAndStoreSnapshotExport(snapshotId, format) {
  const [snapshot, checks] = await Promise.all([
    getSnapshotById(snapshotId),
    getSnapshotChecks(snapshotId),
  ]);

  if (!snapshot) {
    throw new Error("Snapshot не найден");
  }

  let blob;
  let path;

  if (format === "pdf") {
    blob = await generatePdfBlob(snapshot, checks);
    path = buildStoragePath(snapshot, "pdf");
    await uploadBlob(path, blob, "application/pdf");
    await saveExportPath(snapshotId, "pdf", path);
    return path;
  }

  if (format === "excel") {
    blob = await generateExcelBlob(snapshot, checks);
    path = buildStoragePath(snapshot, "xlsx");
    await uploadBlob(
      path,
      blob,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    await saveExportPath(snapshotId, "excel", path);
    return path;
  }

  throw new Error(`Неподдерживаемый формат экспорта: ${format}`);
}
import { supabase } from "../supabase";

export async function getScansByOrganization(organizationId) {
  const { data: scans, error: scansError } = await supabase
    .from("ingestion_batches")
    .select(`
      id,
      organization_id,
      received_at,
      source,
      status,
      assets_count,
      software_count,
      checks_count,
      report_id,
      notes,
      scan_label
    `)
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false });

  if (scansError) throw scansError;

  const reportIds = [...new Set((scans || []).map((item) => item.report_id).filter(Boolean))];

  let reportMap = new Map();

  if (reportIds.length) {
    const { data: reports, error: reportsError } = await supabase
      .from("hardening_reports")
      .select(`
        id,
        total_checks,
        passed,
        failed,
        compliance_score,
        generated_at
      `)
      .in("id", reportIds);

    if (reportsError) throw reportsError;

    reportMap = new Map((reports || []).map((item) => [item.id, item]));
  }

  return (scans || []).map((item, index, arr) => ({
    ...item,
    report: item.report_id ? reportMap.get(item.report_id) || null : null,
    previousScanId: arr[index + 1]?.id || null,
  }));
}
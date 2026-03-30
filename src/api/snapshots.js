import { supabase } from "../supabase";

export async function getSnapshotsByOrganization(organizationId) {
  const { data, error } = await supabase
    .from("scan_snapshots")
    .select(`
      id,
      ingestion_batch_id,
      organization_id,
      scan_number,
      snapshot_label,
      status,
      total_assets,
      total_software,
      total_checks,
      passed,
      failed,
      compliance_score,
      exported_pdf_path,
      exported_excel_path,
      notes,
      created_at
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSnapshotById(snapshotId) {
  const { data, error } = await supabase
    .from("scan_snapshots")
    .select(`
      id,
      ingestion_batch_id,
      organization_id,
      scan_number,
      snapshot_label,
      status,
      total_assets,
      total_software,
      total_checks,
      passed,
      failed,
      compliance_score,
      exported_pdf_path,
      exported_excel_path,
      notes,
      created_at
    `)
    .eq("id", snapshotId)
    .single();

  if (error) throw error;
  return data;
}

export async function getSnapshotChecks(snapshotId) {
  const { data: rows, error: rowsError } = await supabase
    .from("scan_check_results")
    .select(`
      id,
      snapshot_id,
      asset_id,
      rule_id,
      actual_value,
      expected_value,
      status,
      checked_at
    `)
    .eq("snapshot_id", snapshotId);

  if (rowsError) throw rowsError;

  const assetIds = [...new Set((rows || []).map((item) => item.asset_id).filter(Boolean))];
  const ruleIds = [...new Set((rows || []).map((item) => item.rule_id).filter(Boolean))];

  let assetMap = new Map();
  let ruleMap = new Map();

  if (assetIds.length) {
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id, hostname, ip_address, os, asset_type, criticality")
      .in("id", assetIds);

    if (assetsError) throw assetsError;
    assetMap = new Map((assets || []).map((item) => [item.id, item]));
  }

  if (ruleIds.length) {
    const { data: rules, error: rulesError } = await supabase
      .from("hardening_rules")
      .select("id, rule_code, title, severity, source, remediation, expected_value")
      .in("id", ruleIds);

    if (rulesError) throw rulesError;
    ruleMap = new Map((rules || []).map((item) => [item.id, item]));
  }

  return (rows || []).map((item) => ({
    ...item,
    asset: assetMap.get(item.asset_id) || null,
    rule: ruleMap.get(item.rule_id) || null,
  }));
}

export async function compareSnapshots(beforeSnapshotId, afterSnapshotId) {
  const [beforeChecks, afterChecks, beforeSnapshot, afterSnapshot] = await Promise.all([
    getSnapshotChecks(beforeSnapshotId),
    getSnapshotChecks(afterSnapshotId),
    getSnapshotById(beforeSnapshotId),
    getSnapshotById(afterSnapshotId),
  ]);

  const keyOf = (item) => `${item.asset_id || "no-asset"}::${item.rule_id || "no-rule"}`;

  const beforeMap = new Map(beforeChecks.map((item) => [keyOf(item), item]));
  const afterMap = new Map(afterChecks.map((item) => [keyOf(item), item]));

  const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const diffs = [];

  for (const key of allKeys) {
    const before = beforeMap.get(key) || null;
    const after = afterMap.get(key) || null;

    const asset = after?.asset || before?.asset || null;
    const rule = after?.rule || before?.rule || null;

    const beforeStatus = before?.status || null;
    const afterStatus = after?.status || null;

    let changeType = "unchanged";

    if (!before && after) {
      changeType = "new";
    } else if (before && !after) {
      changeType = "removed";
    } else if (beforeStatus === "fail" && afterStatus === "pass") {
      changeType = "fixed";
    } else if (beforeStatus === "pass" && afterStatus === "fail") {
      changeType = "regressed";
    } else if (beforeStatus === "fail" && afterStatus === "fail") {
      changeType = "still_failed";
    } else if (beforeStatus !== afterStatus) {
      changeType = "changed";
    }

    diffs.push({
      key,
      asset,
      rule,
      beforeStatus,
      afterStatus,
      beforeActual: before?.actual_value || null,
      afterActual: after?.actual_value || null,
      expectedValue:
        after?.expected_value ||
        before?.expected_value ||
        after?.rule?.expected_value ||
        before?.rule?.expected_value ||
        null,
      changeType,
    });
  }

  const summary = {
    fixed: diffs.filter((item) => item.changeType === "fixed").length,
    regressed: diffs.filter((item) => item.changeType === "regressed").length,
    stillFailed: diffs.filter((item) => item.changeType === "still_failed").length,
    newIssues: diffs.filter((item) => item.changeType === "new" && item.afterStatus === "fail").length,
    removed: diffs.filter((item) => item.changeType === "removed").length,
    unchanged: diffs.filter((item) => item.changeType === "unchanged").length,
  };

  return {
    beforeSnapshot,
    afterSnapshot,
    diffs,
    summary,
  };
}
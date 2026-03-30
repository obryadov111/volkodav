import { supabase } from "../supabase";

export async function getDashboardSummary(organizationId) {
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id")
    .eq("organization_id", organizationId);

  if (envError) throw envError;

  const environmentIds = (environments || []).map((item) => item.id);

  if (!environmentIds.length) {
    return {
      assetsCount: 0,
      softwareCount: 0,
      checksCount: 0,
      failedChecks: 0,
      reportsCount: 0,
      latestReport: null,
      environmentsCount: 0,
      criticalAssets: 0,
    };
  }

  const [
    assetsResult,
    softwareResult,
    checksResult,
    reportsResult,
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("id, criticality, environment_id")
      .in("environment_id", environmentIds),

    supabase
      .from("software")
      .select("id, asset_id, name"),

    supabase
      .from("hardening_checks")
      .select("id, status, asset_id, checked_at"),

    supabase
      .from("hardening_reports")
      .select("id, total_checks, passed, failed, compliance_score, generated_at")
      .eq("organization_id", organizationId)
      .order("generated_at", { ascending: false }),
  ]);

  if (assetsResult.error) throw assetsResult.error;
  if (softwareResult.error) throw softwareResult.error;
  if (checksResult.error) throw checksResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const assets = assetsResult.data || [];
  const assetIds = new Set(assets.map((item) => item.id));

  const software = (softwareResult.data || []).filter((item) =>
    assetIds.has(item.asset_id)
  );

  const checks = (checksResult.data || []).filter((item) =>
    assetIds.has(item.asset_id)
  );

  const reports = reportsResult.data || [];
  const latestReport = reports[0] || null;

  return {
    assetsCount: assets.length,
    softwareCount: software.length,
    checksCount: checks.length,
    failedChecks: checks.filter((item) => item.status === "fail").length,
    reportsCount: reports.length,
    latestReport,
    environmentsCount: environmentIds.length,
    criticalAssets: assets.filter((item) => item.criticality === "critical").length,
  };
}
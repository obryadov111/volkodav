import { supabase } from "../supabase";

export async function getHardeningByOrganization(organizationId) {
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id")
    .eq("organization_id", organizationId);

  console.log("getHardeningByOrganization -> environments:", environments);
  console.log("getHardeningByOrganization -> envError:", envError);

  if (envError) throw envError;

  const environmentIds = (environments || []).map((item) => item.id);
  if (!environmentIds.length) return [];

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, hostname, environment_id")
    .in("environment_id", environmentIds);

  console.log("getHardeningByOrganization -> assets:", assets);
  console.log("getHardeningByOrganization -> assetsError:", assetsError);

  if (assetsError) throw assetsError;

  const assetMap = new Map((assets || []).map((item) => [item.id, item]));
  const assetIds = [...assetMap.keys()];
  if (!assetIds.length) return [];

  const { data: checks, error: checksError } = await supabase
    .from("hardening_checks")
    .select(`
      id,
      asset_id,
      rule_id,
      actual_value,
      expected_value,
      status,
      checked_at
    `)
    .in("asset_id", assetIds)
    .order("checked_at", { ascending: false });

  console.log("getHardeningByOrganization -> checks:", checks);
  console.log("getHardeningByOrganization -> checksError:", checksError);

  if (checksError) throw checksError;

  const ruleIds = [...new Set((checks || []).map((item) => item.rule_id).filter(Boolean))];

  let ruleMap = new Map();

  if (ruleIds.length) {
    const { data: rules, error: rulesError } = await supabase
      .from("hardening_rules")
      .select(`
        id,
        rule_code,
        title,
        description,
        expected_value,
        source,
        severity,
        remediation
      `)
      .in("id", ruleIds);

    console.log("getHardeningByOrganization -> rules:", rules);
    console.log("getHardeningByOrganization -> rulesError:", rulesError);

    if (rulesError) throw rulesError;
    ruleMap = new Map((rules || []).map((item) => [item.id, item]));
  }

  return (checks || []).map((item) => ({
    ...item,
    asset: assetMap.get(item.asset_id) || null,
    rule: ruleMap.get(item.rule_id) || null,
  }));
}

export async function getHardeningByAsset(assetId) {
  const { data: checks, error: checksError } = await supabase
    .from("hardening_checks")
    .select(`
      id,
      asset_id,
      rule_id,
      actual_value,
      expected_value,
      status,
      checked_at
    `)
    .eq("asset_id", assetId)
    .order("checked_at", { ascending: false });

  if (checksError) throw checksError;

  const ruleIds = [...new Set((checks || []).map((item) => item.rule_id).filter(Boolean))];

  let ruleMap = new Map();

  if (ruleIds.length) {
    const { data: rules, error: rulesError } = await supabase
      .from("hardening_rules")
      .select(`
        id,
        rule_code,
        title,
        description,
        expected_value,
        source,
        severity,
        remediation
      `)
      .in("id", ruleIds);

    if (rulesError) throw rulesError;
    ruleMap = new Map((rules || []).map((item) => [item.id, item]));
  }

  return (checks || []).map((item) => ({
    ...item,
    rule: ruleMap.get(item.rule_id) || null,
  }));
}
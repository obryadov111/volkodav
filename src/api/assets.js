import { supabase } from "../supabase";

export async function getAssetsByOrganization(organizationId) {
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id, name, organization_id")
    .eq("organization_id", organizationId);

  console.log("getAssetsByOrganization -> environments:", environments);
  console.log("getAssetsByOrganization -> envError:", envError);

  if (envError) throw envError;

  const environmentMap = new Map((environments || []).map((env) => [env.id, env]));
  const environmentIds = [...environmentMap.keys()];

  if (!environmentIds.length) return [];

  const { data, error } = await supabase
    .from("assets")
    .select(`
      id,
      environment_id,
      hostname,
      ip_address,
      os,
      asset_type,
      criticality,
      created_at
    `)
    .in("environment_id", environmentIds)
    .order("created_at", { ascending: false });

  console.log("getAssetsByOrganization -> assets:", data);
  console.log("getAssetsByOrganization -> error:", error);

  if (error) throw error;

  return (data || []).map((item) => ({
    ...item,
    environment: environmentMap.get(item.environment_id) || null,
  }));
}

export async function getAssetById(assetId) {
  const { data, error } = await supabase
    .from("assets")
    .select(`
      id,
      environment_id,
      hostname,
      ip_address,
      os,
      asset_type,
      criticality,
      created_at
    `)
    .eq("id", assetId)
    .single();

  if (error) throw error;

  let environment = null;

  if (data?.environment_id) {
    const { data: envData, error: envError } = await supabase
      .from("environments")
      .select("id, name, organization_id")
      .eq("id", data.environment_id)
      .single();

    if (envError) throw envError;
    environment = envData;
  }

  return {
    ...data,
    environment,
  };
}
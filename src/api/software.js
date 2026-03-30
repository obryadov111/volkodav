import { supabase } from "../supabase";

export async function getSoftwareByOrganization(organizationId) {
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select("id")
    .eq("organization_id", organizationId);

  console.log("getSoftwareByOrganization -> environments:", environments);
  console.log("getSoftwareByOrganization -> envError:", envError);

  if (envError) throw envError;

  const environmentIds = (environments || []).map((item) => item.id);
  if (!environmentIds.length) return [];

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, hostname, os, environment_id")
    .in("environment_id", environmentIds);

  console.log("getSoftwareByOrganization -> assets:", assets);
  console.log("getSoftwareByOrganization -> assetsError:", assetsError);

  if (assetsError) throw assetsError;

  const assetMap = new Map((assets || []).map((item) => [item.id, item]));
  const assetIds = [...assetMap.keys()];
  if (!assetIds.length) return [];

  const { data, error } = await supabase
    .from("software")
    .select(`
      id,
      asset_id,
      name,
      version,
      vendor,
      category,
      type,
      created_at
    `)
    .in("asset_id", assetIds)
    .order("name", { ascending: true });

  console.log("getSoftwareByOrganization -> software:", data);
  console.log("getSoftwareByOrganization -> error:", error);

  if (error) throw error;

  return (data || []).map((item) => ({
    ...item,
    asset: assetMap.get(item.asset_id) || null,
  }));
}

export async function getSoftwareByAsset(assetId) {
  const { data, error } = await supabase
    .from("software")
    .select(`
      id,
      asset_id,
      name,
      version,
      vendor,
      category,
      type,
      created_at
    `)
    .eq("asset_id", assetId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}
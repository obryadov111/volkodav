import { supabase } from "../supabase";

export async function getEnvironmentsByOrganization(organizationId) {
  const { data: environments, error: envError } = await supabase
    .from("environments")
    .select(`
      id,
      name,
      organization_id
    `)
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  console.log("getEnvironmentsByOrganization -> environments:", environments);
  console.log("getEnvironmentsByOrganization -> envError:", envError);

  if (envError) throw envError;

  const environmentIds = (environments || []).map((item) => item.id);
  if (!environmentIds.length) return [];

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("id, environment_id, criticality")
    .in("environment_id", environmentIds);

  console.log("getEnvironmentsByOrganization -> assets:", assets);
  console.log("getEnvironmentsByOrganization -> assetsError:", assetsError);

  if (assetsError) throw assetsError;

  return (environments || []).map((env) => ({
    ...env,
    assets: (assets || []).filter((asset) => asset.environment_id === env.id),
  }));
}
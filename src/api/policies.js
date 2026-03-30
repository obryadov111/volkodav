import { supabase } from "../supabase";

export async function getPoliciesByOrganization(organizationId) {
  const { data, error } = await supabase
    .from("policies")
    .select(`
      id,
      organization_id,
      name,
      description,
      scope,
      status,
      owner_name,
      source,
      created_at,
      updated_at
    `)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
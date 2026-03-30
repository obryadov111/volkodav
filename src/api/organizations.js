import { supabase } from "../supabase";

export async function getOrganizations() {
  const { data, error } = await supabase
    .from("client_organizations")
    .select("id, name, industry, country")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}
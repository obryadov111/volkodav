import { supabase } from "../supabase";

export async function getOrganizations() {
  const { data, error } = await supabase
    .from("client_organizations")
    .select("id, name, industry, country")
    .order("name", { ascending: true });

  console.log("getOrganizations -> data:", data);
  console.log("getOrganizations -> error:", error);

  if (error) throw error;
  return data || [];
}
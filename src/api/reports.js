import { supabase } from "../supabase";

export async function getReportsByOrganization(organizationId) {
  const { data, error } = await supabase
    .from("hardening_reports")
    .select(`
      id,
      organization_id,
      total_checks,
      passed,
      failed,
      compliance_score,
      generated_at
    `)
    .eq("organization_id", organizationId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
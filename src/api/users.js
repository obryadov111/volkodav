import { supabase } from "../supabase";

export async function getUsersByOrganization(organizationId) {
  const { data: links, error: linksError } = await supabase
    .from("user_organizations")
    .select("user_id, organization_id, role")
    .eq("organization_id", organizationId);

  if (linksError) throw linksError;

  const userIds = [...new Set((links || []).map((item) => item.user_id).filter(Boolean))];

  if (!userIds.length) return [];

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  if (usersError) throw usersError;

  const userMap = new Map((users || []).map((item) => [item.id, item]));

  return (links || []).map((item) => ({
    id: item.user_id,
    email: userMap.get(item.user_id)?.email || "—",
    role: item.role,
  }));
}

export async function addUserToOrganization(email, organizationId, role) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", normalizedEmail)
    .single();

  if (userError || !user) {
    throw new Error("Пользователь с таким email не найден");
  }

  const { error } = await supabase
    .from("user_organizations")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      role,
    });

  if (error) throw error;
}

export async function removeUserFromOrganization(userId, organizationId) {
  const { error } = await supabase
    .from("user_organizations")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function updateUserRole(userId, organizationId, role) {
  const { error } = await supabase
    .from("user_organizations")
    .update({ role })
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function getCurrentUserRoleInOrganization(organizationId) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user || !organizationId) return null;

  const { data, error } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data?.role || null;
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || "",
  };
}

export async function createUserProfile() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Нет пользователя");

  const { error: insertError } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email,
      account_status: "pending",
    });

  if (insertError) throw insertError;
}
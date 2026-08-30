import { apiFetch } from "./client";

export async function getOrganizations() {
  return apiFetch("/organizations");
}

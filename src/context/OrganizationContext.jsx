import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getOrganizations } from "../api/organizations";

const OrganizationContext = createContext(null);
const STORAGE_KEY = "selected_organization_id";

export function OrganizationProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrganizations() {
      try {
        setLoading(true);
        setError("");

        const rows = await getOrganizations();
        setOrganizations(rows);

        if (!rows.length) {
          setSelectedOrganizationId(null);
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        const savedId = localStorage.getItem(STORAGE_KEY);
        const hasValidSavedId = rows.some((org) => org.id === savedId);

        if (hasValidSavedId) {
          setSelectedOrganizationId(savedId);
        } else {
          const firstId = rows[0].id;
          setSelectedOrganizationId(firstId);
          localStorage.setItem(STORAGE_KEY, firstId);
        }
      } catch (err) {
        console.error("Ошибка загрузки организаций:", err);
        setOrganizations([]);
        setSelectedOrganizationId(null);
        setError(err?.message || "Не удалось загрузить организации");
      } finally {
        setLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const exists = organizations.some((org) => org.id === selectedOrganizationId);

    if (exists) {
      localStorage.setItem(STORAGE_KEY, selectedOrganizationId);
    }
  }, [selectedOrganizationId, organizations]);

  const selectedOrganization =
    organizations.find((org) => org.id === selectedOrganizationId) || null;

  const value = useMemo(
    () => ({
      organizations,
      selectedOrganizationId,
      setSelectedOrganizationId,
      selectedOrganization,
      loading,
      error,
      hasOrganizations: organizations.length > 0,
    }),
    [
      organizations,
      selectedOrganizationId,
      selectedOrganization,
      loading,
      error,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- хук и провайдер намеренно живут в одном файле
export function useOrganization() {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }

  return context;
}
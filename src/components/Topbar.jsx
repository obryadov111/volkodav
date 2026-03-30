import { Bell, Building2, LogOut, Search, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { useOrganization } from "../context/OrganizationContext";

export default function Topbar() {
  const navigate = useNavigate();

  const {
    organizations,
    selectedOrganizationId,
    setSelectedOrganizationId,
    selectedOrganization,
    loading: orgLoading,
    hasOrganizations,
  } = useOrganization();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Ошибка выхода:", error.message);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-[#0b0f14]/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-lg font-semibold text-white">Volkodav</div>
          <div className="text-sm text-zinc-400">
            {selectedOrganization
              ? `Текущая организация: ${selectedOrganization.name}`
              : "Панель мониторинга харденинга"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <Building2 size={16} className="text-zinc-500" />

            <select
              value={selectedOrganizationId || ""}
              onChange={(e) => setSelectedOrganizationId(e.target.value)}
              disabled={orgLoading || !hasOrganizations}
              className="min-w-[220px] bg-transparent text-sm text-white outline-none disabled:text-zinc-500"
            >
              {orgLoading ? (
                <option value="">Загрузка организаций...</option>
              ) : !hasOrganizations ? (
                <option value="">Нет организаций</option>
              ) : (
                organizations.map((org) => (
                  <option
                    key={org.id}
                    value={org.id}
                    className="bg-zinc-900 text-white"
                  >
                    {org.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 md:flex">
            <Search size={16} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск..."
              className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <button
            type="button"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Bell size={18} />
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
              <Shield size={16} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium text-white">admin</div>
              <div className="text-xs text-zinc-400">Security Analyst</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
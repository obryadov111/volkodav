import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  ShieldCheck,
  FileText,
  BookOpen,
  FolderKanban,
  Boxes,
  History,
} from "lucide-react";

const menuItems = [
  { to: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { to: "/assets", label: "Активы", icon: Server },
  { to: "/software", label: "Инвентаризация ПО", icon: Boxes },
  { to: "/hardening", label: "Харденинг", icon: ShieldCheck },
  { to: "/policies", label: "Политики", icon: BookOpen },
  { to: "/report", label: "Отчёты", icon: FileText },
  { to: "/scans", label: "Сканирования", icon: History },
  { to: "/project", label: "Инфраструктура", icon: FolderKanban },
];

export default function Sidebar() {
  const location = useLocation();

  const getItemClassName = (path) => {
    const isActive =
      location.pathname === path ||
      (path !== "/dashboard" && location.pathname.startsWith(path));

    return [
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "border border-blue-500/20 bg-blue-500/15 text-blue-300"
        : "border border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white",
    ].join(" ");
  };

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="text-lg font-semibold tracking-wide text-white">Харденинг</div>
        <div className="mt-1 text-xs text-zinc-400">
          Hardening / Compliance UI
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link key={item.to} to={item.to} className={getItemClassName(item.to)}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
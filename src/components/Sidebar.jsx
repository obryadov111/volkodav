import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  ShieldCheck,
  FileText,
  BookOpen,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const item = (path) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
      location.pathname === path
        ? "bg-blue-500/10 text-blue-400"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
    }`;

  return (
    <aside className="w-64 border-r border-zinc-800 bg-[#0b0f14] p-4">

      <div className="mb-6 text-lg font-semibold text-white">
        Yakilka
      </div>

      <nav className="space-y-1">

        <Link to="/" className={item("/")}>
          <LayoutDashboard size={18} />
          Обзор
        </Link>

        <Link to="/assets" className={item("/assets")}>
          <Server size={18} />
          Активы
        </Link>

        <Link to="/hardening" className={item("/hardening")}>
          <ShieldCheck size={18} />
          Харденинг
        </Link>

        <Link to="/policies" className={item("/policies")}>
          <BookOpen size={18} />
          Политики
        </Link>

        <Link to="/report" className={item("/report")}>
          <FileText size={18} />
          Отчёты
        </Link>

      </nav>
    </aside>
  );
}
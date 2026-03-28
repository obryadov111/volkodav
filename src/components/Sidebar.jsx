import { useState } from "react";
import { Home, Folder, FileText, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const item = (path) =>
  `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
    location.pathname === path
      ? "bg-zinc-800 text-white"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
  }`;

  return (
    <aside
      className={`bg-zinc-900 border-r border-zinc-800 ${
        open ? "w-64" : "w-16"
      } transition-all`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="p-3 text-zinc-400"
      >
        ☰
      </button>

      <nav className="space-y-1">
        <Link to="/" className={item("/")}>
          <Home size={18} />
          {open && "Dashboard"}
        </Link>

        <Link to="/project" className={item("/project")}>
          <Folder size={18} />
          {open && "Project"}
        </Link>

        <Link to="/reports" className={item("/reports")}>
          <FileText size={18} />
          {open && "Reports"}
        </Link>

        <Link to="/settings" className={item("/settings")}>
          <Settings size={18} />
          {open && "Settings"}
        </Link>
        <Link to="/agents" className={item("/agents")}>
        🤖 {open && "Agents"}
        </Link>

        <Link to="/hardening" className={item("/hardening")}>
        🧠 {open && "Hardening"}
        </Link>

        <Link to="/policies" className={item("/policies")}>
         {open && "Policies"}
        </Link>
      </nav>
    </aside>
  );
}
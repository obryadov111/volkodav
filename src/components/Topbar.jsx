import { Bell, User } from "lucide-react";
import CompanySelector from "./CompanySelector";

export default function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
      
      <div className="flex items-center gap-4">
        <div className="font-semibold text-lg">Volkodav</div>
        <CompanySelector />
      </div>

      <input
        placeholder="Поиск по инфраструктуре..."
        className="bg-zinc-900 px-3 py-1 rounded w-80"
      />

      <div className="flex gap-4">
        <Bell className="text-zinc-400 hover:text-white cursor-pointer" />
        <User className="text-zinc-400 hover:text-white cursor-pointer" />
      </div>
    </header>
  );
}
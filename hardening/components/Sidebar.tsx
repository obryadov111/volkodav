import { Link } from "react-router-dom";
import { Home, Monitor, AlertTriangle, Shield } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <Link to="/"><Home size={18}/> Dashboard</Link>
      <Link to="/devices"><Monitor size={18}/> Devices</Link>
      <Link to="/violations"><AlertTriangle size={18}/> Violations</Link>
      <Link to="/rules"><Shield size={18}/> Rules</Link>
    </div>
  );
}
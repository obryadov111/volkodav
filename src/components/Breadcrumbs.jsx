import { useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const path = location.pathname.split("/").filter(Boolean);

  return (
    <div className="text-sm text-zinc-500 mb-4">
      Главная {path.map((p, i) => " / " + p)}
    </div>
  );
}
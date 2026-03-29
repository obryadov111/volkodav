import { Link } from "react-router-dom";

export default function Assets() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Активы</h1>

      <div className="grid grid-cols-3 gap-4">

        <Link
          to="/assets/1"
          className="card p-4 hover:scale-[1.02] transition"
        >
          <p>server-01</p>
          <p className="text-sm text-blue-400">Linux</p>
        </Link>

      </div>
    </div>
  );
}
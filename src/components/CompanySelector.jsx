import { useState } from "react";

export default function CompanySelector() {
  const [company, setCompany] = useState("Acme Corp");

  return (
    <select
      value={company}
      onChange={(e) => setCompany(e.target.value)}
      className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-sm"
    >
      <option>Acme Corp</option>
      <option>Cyberdyne</option>
      <option>Umbrella</option>
    </select>
  );
}
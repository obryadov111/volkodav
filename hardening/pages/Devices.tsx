import { useEffect, useState } from "react";
import { getData } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    getData("/devices").then(setDevices);
  }, []);

  const filtered = devices.filter(d =>
    d.hostname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <h2>Devices</h2>

      <input
        className="search"
        placeholder="Search..."
        onChange={e => setSearch(e.target.value)}
      />

      <table>
        <thead>
          <tr><th>Hostname</th><th>OS</th><th>Status</th></tr>
        </thead>
        <tbody>
          {filtered.map(d => (
            <tr key={d.id} onClick={() => nav(`/device/${d.id}`)}>
              <td>{d.hostname}</td>
              <td>{d.os}</td>
              <td>{d.online ? "🟢" : "🔴"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
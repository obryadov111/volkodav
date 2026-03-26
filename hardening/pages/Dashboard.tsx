import { useEffect, useState } from "react";
import { getData } from "../api/api";

export default function Dashboard() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    getData("/dashboard").then(setData);
  }, []);

  return (
    <>
      <h2>Dashboard</h2>
      <div className="card">Devices: {data.devices}</div>
      <div className="card">Violations: {data.violations}</div>
    </>
  );
}
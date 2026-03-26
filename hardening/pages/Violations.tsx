import { useEffect, useState } from "react";
import { getData } from "../api/api";

export default function Violations() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    getData("/violations").then(setData);
  }, []);

  return (
    <>
      <h2>Violations</h2>
      <table>
        <thead>
          <tr><th>Device</th><th>Rule</th><th>Status</th></tr>
        </thead>
        <tbody>
          {data.map((v, i) => (
            <tr key={i}>
              <td>{v.device}</td>
              <td>{v.rule}</td>
              <td className={v.status === "OK" ? "ok" : "fail"}>
                {v.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
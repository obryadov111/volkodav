import { useEffect, useState } from "react";
import { getData } from "../api/api";

export default function Rules() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    getData("/rules").then(setData);
  }, []);

  return (
    <>
      <h2>Rules</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Severity</th></tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getData } from "../api/api";

export default function Device() {
  const { id } = useParams();
  const [device, setDevice] = useState<any>({});

  useEffect(() => {
    getData(`/devices/${id}`).then(setDevice);
  }, [id]);

  return (
    <>
      <h2>{device.hostname}</h2>
      <div className="card">OS: {device.os}</div>
    </>
  );
}
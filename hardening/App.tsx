import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Device from "./pages/Device";
import Violations from "./pages/Violations";
import Rules from "./pages/Rules";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/device/:id" element={<Device />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/rules" element={<Rules />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
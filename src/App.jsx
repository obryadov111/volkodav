import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Agents from "./pages/Agents";
import Hardening from "./pages/Hardening";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Policies from "./pages/Policies";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="project" element={<Project />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="agents" element={<Agents />} />
          <Route path="hardening" element={<Hardening />} />
          <Route path="policies" element={<Policies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Hardening from "./pages/Hardening";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";
import Settings from "./pages/Settings";
import Policies from "./pages/Policies";
import Assets from "./pages/Assets";
import Report from "./pages/Report";
import AssetDetails from "./pages/AssetDetails";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="project" element={<Project />} />
          <Route path="settings" element={<Settings />} />
          <Route path="hardening" element={<Hardening />} />
          <Route path="policies" element={<Policies />} />
          <Route path="assets" element={<Assets />} />
          <Route path="report" element={<Report />} />
          <Route path="assets/:id" element={<AssetDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
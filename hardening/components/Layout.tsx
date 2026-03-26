import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children }: any) {
  return (
    <>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <div className="main">
          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
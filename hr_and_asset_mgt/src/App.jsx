import { useState } from "react";
import NavigationBar from "./components/navigation/Navbar.jsx";
import Sidebar from "./components/navigation/Sidebar.jsx";
import MyRequests from "./pages/myRequests/MyRequests.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

import "./style/layout.css";
import "./style/myRequests.css";

export default function App() {
  const [activeKey, setActiveKey] = useState("My Requests");

  return (
    <div className="app-shell">
      <Sidebar activeKey={activeKey} onSelect={setActiveKey} />
      <div className="app-main">
        <NavigationBar />
        <div className="app-content">
          <MyRequests />
        </div>
      </div>
    </div>
  );
}

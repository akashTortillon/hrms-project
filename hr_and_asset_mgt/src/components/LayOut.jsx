import Sidebar from "./navigation/Sidebar.jsx";
import NavigationBar from "./navigation/Navbar.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider } from "../contexts/RoleContext.jsx";

import Dashboard from "../pages/Dashboard/DashboardView.jsx";
import Employees from "../pages/Employees/EmployeesView.jsx";
import Payroll from "../pages/Payroll/PayrollView.jsx";
import Attendance from "../pages/Attendance/AttendanceView.jsx";
import Documents from "../pages/Documents/DocumentView.jsx";
import Assets from "../pages/Assets/AssetsView.jsx";
import MyRequests from "../pages/MyRequests/MyRequests.jsx";
import Reports from "../pages/Reports/ReportsView.jsx";
import Masters from "../pages/Masters/MastersView.jsx";

export default function Layout() {
  return (
    <RoleProvider>
      <div className="app-shell">
        <Sidebar />

        <div className="app-main">
          <NavigationBar />

          <div className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/requests" element={<MyRequests />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/masters" element={<Masters />} />
            </Routes>
          </div>
        </div>
      </div>
    </RoleProvider>
  );
}

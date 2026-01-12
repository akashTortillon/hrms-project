import { useRole } from "../../contexts/RoleContext.jsx";
import EmployeeRequests from "./EmployeeRequests.jsx";
import AdminRequests from "./AdminRequests.jsx";

export default function MyRequests() {
  const { role } = useRole();

  // Render EmployeeRequests for Employee role, AdminRequests for Admin/Manager roles
  if (role === "Employee") {
    return <EmployeeRequests />;
  }

  return <AdminRequests />;
}
import { useRole } from "../../contexts/RoleContext.jsx";
import EmployeeRequests from "./EmployeeRequests.jsx";
import AdminRequests from "./AdminRequests.jsx";

export default function MyRequests() {
  const { role } = useRole();

  if (role === "Employee") {
    return <EmployeeRequests />;
  }

  return <AdminRequests />;
}
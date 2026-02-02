import { useRole } from "../../contexts/RoleContext.jsx";
import EmployeeRequests from "./EmployeeRequests.jsx";
import AdminRequests from "./AdminRequests.jsx";

export default function MyRequests() {
  const { hasPermission } = useRole();

  // If user cannot approve requests, show personal requests view
  if (!hasPermission("APPROVE_REQUESTS")) {
    return <EmployeeRequests />;
  }

  return <AdminRequests />;
}
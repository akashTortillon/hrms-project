
import Card from "../../components/reusable/Card";
import AppButton from "../../components/reusable/Button";
import "../../style/Attendance.css";
export const shifts = [
  {
    id: 1,
    title: "Day Shift",
    time: "08:00 AM - 05:00 PM",
    employees: 5,
  },
  {
    id: 2,
    title: "Night Shift",
    time: "08:00 PM - 05:00 AM",
    employees: 0,
  },
  {
    id: 3,
    title: "Flexible",
    time: "Custom hours",
    employees: 0,
  },
];


export default function ShiftManagement() {
  return (
    <div className="shift-management">
      {/* Header */}
      <div className="shift-management-header">
        <h3 className="section-title">Shift Management</h3>
        <AppButton variant="primary">Create Shift</AppButton>
      </div>

      {/* Cards */}
      <div className="shift-cards">
        {shifts.map((shift) => (
          <Card key={shift.id} className="shift-card">
            <div className="shift-card-content">
              <div className="shift-title">{shift.title}</div>
              <div className="shift-time">{shift.time}</div>
              <div className="shift-employees">
                {shift.employees} employees assigned
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

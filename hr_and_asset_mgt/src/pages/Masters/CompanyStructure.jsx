
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Masters.css";

export default function CompanyStructure() {
  return (
    <div className="company-structure">

      {/* Header */}
      <div className="company-structure-header">
        <h2 className="company-structure-title">Company Structure Masters</h2>
        <p className="company-structure-subtitle">
          Define departments, branches, and organizational hierarchy
        </p>
      </div>

      {/* Departments */}
      <Card title="Departments" className="structure-card">
        <div className="structure-header-action">
          <Button size="sm">Add</Button>
        </div>

        <div className="pill-list">
          {["Sales", "HR", "Operations", "Finance", "IT", "Admin", "Marketing"].map(
            (dept) => (
              <div key={dept} className="structure-item">
          <span className="structure-name">{dept}</span>

          <div className="structure-actions">
            <button className="icon-btn edit">
              <SvgIcon name="edit" size={18} />
            </button>

            <button className="icon-btn delete">
              <SvgIcon name="delete" size={18} />
            </button>
          </div>
        </div>
            )
          )}
        </div>
      </Card>

      {/* Branches */}
      <Card title="Branches" className="structure-card">
        <div className="structure-header-action">
          <Button size="sm">Add</Button>
        </div>

        <div className="structure-list">
          {[
            "Main Office - Dubai",
            "Branch RAK",
            "Dubai Branch",
            "Abu Dhabi Office",
          ].map((branch) => (
            <span key={branch} className="pill-item">{branch}</span>
          ))}
        </div>
      </Card>

      {/* Designations */}
      <Card title="Designations" className="structure-card">
        <div className="structure-header-action">
          <Button size="sm">Add</Button>
        </div>

        <div className="pill-list">
          {[
            "CEO",
            "Manager",
            "Executive",
            "Supervisor",
            "Staff",
            "Intern",
          ].map((role) => (
            <span key={role} className="pill-item">{role}</span>
          ))}
        </div>
      </Card>

      {/* Roles & Permissions */}
      <Card className="roles-card">
                <div className="roles-header">
                <div className="roles-header-text">
            <h3>User Roles & Permissions</h3>
            <p>Manage access control and permissions</p>
            </div>

            <Button variant="primary" size="sm">
            Configure Roles
            </Button>
          
        </div>

        

        <div className="roles-list">
          {[
            { role: "Admin", desc: "Full system access" },
            { role: "HR Manager", desc: "HR module access" },
            { role: "Department Head", desc: "Department access" },
            { role: "Employee", desc: "Self-service access" },
          ].map((item) => (
            <div key={item.role} className="role-item">
              <div>
                <div className="role-name">{item.role}</div>
                <div className="role-desc">{item.desc}</div>
              </div>
              
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}

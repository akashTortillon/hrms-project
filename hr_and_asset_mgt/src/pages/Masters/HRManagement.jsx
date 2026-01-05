import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import "../../style/Masters.css";

const SIMPLE_LISTS = [
  {
    title: "Employee Types",
    items: ["Permanent", "Contract", "Intern", "Temporary", "Part-Time"],
  },
  {
    title: "Leave Types",
    items: [
      "Annual Leave",
      "Sick Leave",
      "Maternity Leave",
      "Paternity Leave",
      "Unpaid Leave",
    ],
  },
  {
    title: "Document Types",
    items: [
      "Passport",
      "Emirates ID",
      "Visa",
      "Employment Contract",
      "Medical Insurance",
    ],
  },
  {
    title: "Nationalities",
    items: [
      "Emirati",
      "Indian",
      "Pakistani",
      "Filipino",
      "Egyptian",
      "British",
      "American",
    ],
  },
];

const RULES = [
  {
    title: "Annual Leave",
    desc: "30 days per year",
    note: "Accrues monthly",
  },
  {
    title: "Sick Leave",
    desc: "15 days per year",
    note: "As per UAE law",
  },
  {
    title: "Overtime Rate",
    desc: "1.25x base rate",
    note: "Configurable",
  },
];

const WORKFLOWS = [
  {
    title: "Leave Approval Chain",
    desc: "Department Head → HR Manager → Final Approval",
  },
  {
    title: "Onboarding Checklist",
    desc: "12 tasks from offer letter to first day",
  },
];

export default function HRManagement() {
  return (
    <div className="hr-management">

      {/* Header */}
      <div className="masters-header">
        <h3>HR Management Masters</h3>
        <p>
          Configure employee classification, leave policies, and compliance
          settings
        </p>
      </div>

      {/* Classification Sections */}
      <div className="masters-grid">
        {SIMPLE_LISTS.map((section) => (
          <Card key={section.title} className="masters-card">
            <div className="masters-card-header">
              <h4>{section.title}</h4>
              <Button size="sm">Add</Button>
            </div>

            <ul className="masters-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Rules Section */}
      <Card className="rules-card">
        <div className="masters-card-header">
          <h4>Leave & Payroll Rules</h4>
          <Button size="sm">Configure Rules</Button>
        </div>

        <div className="rules-list">
          {RULES.map((rule) => (
            <div key={rule.title} className="rule-item">
              <div>
                <div className="rule-title">{rule.title}</div>
                <div className="rule-desc">{rule.desc}</div>
              </div>
              <span className="rule-note">{rule.note}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflow Templates */}
      <Card className="workflow-card">
        <div className="masters-card-header">
          <h4>Workflow Templates</h4>
          <Button size="sm">Add Template</Button>
        </div>

        <div className="workflow-list">
          {WORKFLOWS.map((wf) => (
            <div key={wf.title} className="workflow-item">
              <div>
                <div className="workflow-title">{wf.title}</div>
                <div className="workflow-desc">{wf.desc}</div>
              </div>
              <button className="edit-link">Edit</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

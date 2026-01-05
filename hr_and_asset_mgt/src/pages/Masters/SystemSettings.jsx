import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Masters.css";

const HOLIDAYS = [
  "New Year",
  "Eid Al Fitr",
  "Eid Al Adha",
  "National Day",
  "Commemoration Day",
];

export default function SystemSettings() {
  return (
    <div className="system-settings">

      {/* Header */}
      <div className="masters-header">
        <h2>System Settings</h2>
        <p>Configure global system preferences and settings</p>
      </div>

      {/* Global Settings */}
      <Card title="Global Settings">
        <div className="settings-grid">

          <div className="setting-field">
            <label>Currency</label>
            <select>
              <option>EUR</option>
              <option>USD</option>
              <option>AED</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Date Format</label>
            <select>
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Timezone</label>
            <select>
              <option>Asia/Dubai</option>
              <option>Asia/Kolkata</option>
            </select>
          </div>

          <div className="setting-field">
            <label>Fiscal Year Start</label>
            <select>
              <option>April</option>
              <option>January</option>
            </select>
          </div>

        </div>
      </Card>

      {/* Public Holiday Calendar */}
      <Card
        title="Public Holiday Calendar"
        subtitle="UAE-specific holidays"
        className="mt-24"
      >
        <div className="card-header-action">
          <Button>Add Holiday</Button>
        </div>

        <ul className="editable-list">
          {HOLIDAYS.map((holiday) => (
            <li key={holiday} className="editable-item">
              <span>{holiday}</span>
              <button className="edit-link">
                <SvgIcon name="edit" size={16} />
                Edit
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Notification Engine */}
      <Card
        title="Notification Engine"
        subtitle="Configure system notifications"
        className="mt-24"
      >
        <div className="toggle-list">

          <div className="toggle-item">
            <div>
              <div className="toggle-title">Document Expiry Alerts</div>
              <div className="toggle-desc">
                Send notifications for expiring documents
              </div>
            </div>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="toggle-item">
            <div>
              <div className="toggle-title">Leave Request Notifications</div>
              <div className="toggle-desc">
                Notify approvers of new requests
              </div>
            </div>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="toggle-item">
            <div>
              <div className="toggle-title">Asset Maintenance Reminders</div>
              <div className="toggle-desc">
                Alert for upcoming maintenance
              </div>
            </div>
            <input type="checkbox" />
          </div>

        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management" className="mt-24">
        <div className="data-actions">

          <div className="data-action">
            <div>
              <div className="data-title">Bulk Import</div>
              <div className="data-desc">Import employees or assets</div>
            </div>
            <Button>Import</Button>
          </div>

          <div className="data-action">
            <div>
              <div className="data-title">Backup Data</div>
              <div className="data-desc">Create system backup</div>
            </div>
            <Button>Backup</Button>
          </div>

          <div className="data-action">
            <div>
              <div className="data-title">Restore</div>
              <div className="data-desc">Restore from backup</div>
            </div>
            <Button variant="danger">Restore</Button>
          </div>

        </div>
      </Card>

    </div>
  );
}

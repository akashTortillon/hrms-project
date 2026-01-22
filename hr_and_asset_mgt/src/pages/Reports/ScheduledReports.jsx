import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import "../../style/Reports.css";
import SvgIcon from "../../components/svgIcon/svgView";

export default function ScheduledReports() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Active",
    frequency: "Daily"
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get("/api/reports/schedules");
      if (response.data.success) {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load report schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormData({
        title: item.title,
        description: item.description,
        status: item.status,
        frequency: item.frequency || "Daily"
      });
    } else {
      setEditingId(null);
      setFormData({ title: "", description: "", status: "Active", frequency: "Daily" });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const response = await axios.patch(`/api/reports/schedules/${editingId}`, formData);
        if (response.data.success) {
          setSchedules(schedules.map(s => s._id === editingId ? response.data.data : s));
          toast.success("Schedule updated successfully");
        }
      } else {
        const response = await axios.post("/api/reports/schedules", formData);
        if (response.data.success) {
          setSchedules([...schedules, response.data.data]);
          toast.success("New schedule created");
        }
      }
      setShowModal(false);
    } catch (error) {
      toast.error("Failed to save schedule");
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      const response = await axios.patch(`/api/reports/schedules/${id}`, { status: newStatus });
      if (response.data.success) {
        setSchedules(schedules.map(s => s._id === id ? { ...s, status: newStatus } : s));
        toast.success(`Schedule ${newStatus === "Active" ? "Activated" : "Deactivated"}`);
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const response = await axios.delete(`/api/reports/schedules/${id}`);
      if (response.data.success) {
        setSchedules(schedules.filter(s => s._id !== id));
        toast.success("Schedule deleted");
      }
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  if (loading) return <div className="p-4 text-center">Loading Schedules...</div>;

  return (
    <Card className="scheduled-reports-card">
      <div className="scheduled-header">
        <div className="scheduled-header-text">
          <h3 className="scheduled-section-title">Scheduled Reports</h3>
          <p className="scheduled-section-subtitle">
            Automated report generation schedule
          </p>
        </div>
        <button className="manage-link" onClick={() => handleOpenModal()}>Manage Schedules</button>
      </div>

      <div className="scheduled-list">
        {schedules.map((item) => (
          <div key={item._id} className="scheduled-item">
            <div className="scheduled-info">
              <div className="scheduled-title">{item.title}</div>
              <div className="scheduled-desc">{item.description}</div>
            </div>

            <div className="scheduled-actions">
              <span
                className={`status-pill ${item.status === "Active" ? "active" : "inactive"}`}
                onClick={() => toggleStatus(item._id, item.status)}
                style={{ cursor: 'pointer' }}
              >
                {item.status}
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="edit-link" onClick={() => handleOpenModal(item)}><SvgIcon name="edit" size={14}/></button>
                <button
                  className="delete-link"
                  onClick={() => handleDelete(item._id)}
                  style={{ color: '#ff4d4d', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <SvgIcon name="delete" size={16}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Basic Editor Modal */}
      {showModal && (
        <div className="report-modal-overlay">
          <div className="report-modal-content">
            <h3>{editingId ? "Edit Schedule" : "Add New Schedule"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <Button type="submit">{editingId ? "Save Changes" : "Create Schedule"}</Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

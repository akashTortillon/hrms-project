import { useEffect, useState, useRef } from "react";
import { announcementService } from "../../services/announcementService";
import { getBranches, getCompanies, getDepartments } from "../../services/masterService";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";
import "../../style/Announcements.css";

export default function AnnouncementsView() {
  const { hasPermission } = useRole();
  const imageInputRef = useRef(null);

  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({
    title: "", message: "", category: "GENERAL", audience: "ALL",
    branch: "", company: "", department: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Filter state
  const [filterBranch, setFilterBranch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Master data
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const loadMasters = async () => {
    try {
      const [b, c, d] = await Promise.all([getBranches(), getCompanies(), getDepartments()]);
      setBranches(Array.isArray(b) ? b : []);
      setCompanies(Array.isArray(c) ? c : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
  };

  const loadData = async () => {
    try {
      const filters = {
        branch: filterBranch || undefined,
        company: filterCompany || undefined,
        department: filterDepartment || undefined,
        category: filterCategory || undefined,
      };
      setAnnouncements(await announcementService.getAll(filters));
    } catch {
      toast.error("Failed to load announcements");
    }
  };

  useEffect(() => { loadMasters(); }, []);
  useEffect(() => { loadData(); }, [filterBranch, filterCompany, filterDepartment, filterCategory]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const createAnnouncement = async () => {
    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v) payload.append(k, v); });
        payload.append("image", imageFile);
      } else {
        payload = { ...form };
      }
      await announcementService.create(payload);
      setForm({ title: "", message: "", category: "GENERAL", audience: "ALL", branch: "", company: "", department: "" });
      setImageFile(null);
      setImagePreview(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      loadData();
      toast.success("Announcement published");
    } catch {
      toast.error("Failed to create announcement");
    }
  };

  const getCategoryLabel = (value) =>
    String(value || "GENERAL").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const getCategoryClass = (value) => {
    switch (value) {
      case "BIRTHDAY": return "announcement-badge birthday";
      case "LEAVE_REMINDER": return "announcement-badge leave";
      case "HR_NOTIFICATION": return "announcement-badge hr";
      default: return "announcement-badge general";
    }
  };

  const formatDate = (value) => {
    if (!value) return "Recently published";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "Recently published" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const selectStyle = {
    padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db",
    fontSize: "13px", background: "white", height: "36px", minWidth: "140px"
  };

  return (
    <div className="announcements-page">
      <section className="announcements-hero">
        <div>
          <span className="announcements-hero__eyebrow">Internal Communication Hub</span>
          <h2>Announcements</h2>
          <p>Birthday reminders, leave reminders, and HR notifications in one polished workspace.</p>
        </div>
        <div className="announcements-hero__stats">
          <div className="announcements-stat-card">
            <span className="announcements-stat-card__label">Total Posts</span>
            <strong className="announcements-stat-card__value">{announcements.length}</strong>
          </div>
          <div className="announcements-stat-card">
            <span className="announcements-stat-card__label">Latest Category</span>
            <strong className="announcements-stat-card__value">
              {announcements[0] ? getCategoryLabel(announcements[0].category) : "General"}
            </strong>
          </div>
        </div>
      </section>

      {hasPermission("MANAGE_ANNOUNCEMENTS") && (
        <section className="announcement-composer">
          <div className="announcement-composer__header">
            <div>
              <span className="announcement-composer__eyebrow">Publisher</span>
              <h3>Create Announcement</h3>
              <p>Share internal updates with a cleaner, more executive-style publishing flow.</p>
            </div>
            <div className="announcement-composer__pill">Visible to Employees</div>
          </div>

          <div className="announcement-composer__grid">
            <div className="announcement-field announcement-field--full">
              <label>Title</label>
              <input
                placeholder="Enter announcement title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="announcement-field announcement-field--full">
              <label>Message</label>
              <textarea
                placeholder="Write a crisp update for your team"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
              />
            </div>

            <div className="announcement-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="GENERAL">General</option>
                <option value="BIRTHDAY">Birthday</option>
                <option value="LEAVE_REMINDER">Leave Reminder</option>
                <option value="HR_NOTIFICATION">HR Notification</option>
              </select>
            </div>

            <div className="announcement-field">
              <label>Audience</label>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="ALL">All Employees</option>
                <option value="BRANCH">By Branch</option>
                <option value="COMPANY">By Company</option>
                <option value="DEPARTMENT">By Department</option>
              </select>
            </div>

            {form.audience === "BRANCH" && (
              <div className="announcement-field">
                <label>Branch</label>
                <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            )}

            {form.audience === "COMPANY" && (
              <div className="announcement-field">
                <label>Company</label>
                <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}

            {form.audience === "DEPARTMENT" && (
              <div className="announcement-field">
                <label>Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            )}

            {/* Image Upload */}
            <div className="announcement-field announcement-field--full">
              <label>Attach Image (optional)</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                style={{ fontSize: "13px" }}
              />
              {imagePreview && (
                <div style={{ marginTop: "10px" }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxHeight: "160px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="announcement-composer__actions">
            <button
              className="announcement-publish-btn"
              onClick={createAnnouncement}
              disabled={!form.title.trim() || !form.message.trim()}
            >
              Publish Announcement
            </button>
          </div>
        </section>
      )}

      <section className="announcements-feed">
        <div className="announcements-feed__header">
          <div>
            <span className="announcements-feed__eyebrow">Live Feed</span>
            <h3>Published Announcements</h3>
          </div>
          <div className="announcements-feed__count">{announcements.length} item{announcements.length === 1 ? "" : "s"}</div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", padding: "14px 0" }}>
          <select style={selectStyle} value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id || b.name} value={b.name}>{b.name}</option>)}
          </select>
          <select style={selectStyle} value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select style={selectStyle} value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}
          </select>
          <select style={selectStyle} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="BIRTHDAY">Birthday</option>
            <option value="LEAVE_REMINDER">Leave Reminder</option>
            <option value="HR_NOTIFICATION">HR Notification</option>
          </select>
          {(filterBranch || filterCompany || filterDepartment || filterCategory) && (
            <button
              onClick={() => { setFilterBranch(""); setFilterCompany(""); setFilterDepartment(""); setFilterCategory(""); }}
              style={{ ...selectStyle, background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5", cursor: "pointer" }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="announcements-list">
          {announcements.length === 0 ? (
            <div className="announcements-empty-state">
              <div className="announcements-empty-state__title">No announcements found</div>
              <p>Try adjusting your filters or publish a new announcement.</p>
            </div>
          ) : (
            announcements.map((item) => (
              <article key={item._id} className="announcement-card">
                <div className="announcement-card__top">
                  <div>
                    <div className="announcement-card__title">{item.title}</div>
                    <div className="announcement-card__meta">{formatDate(item.createdAt)}</div>
                  </div>
                  <span className={getCategoryClass(item.category)}>{getCategoryLabel(item.category)}</span>
                </div>

                <p className="announcement-card__message">{item.message}</p>

                {item.imageUrl && (
                  <div style={{ marginTop: "12px" }}>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ maxWidth: "100%", maxHeight: "280px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e5e7eb" }}
                    />
                  </div>
                )}

                {(item.branch || item.company || item.department) && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {item.branch && (
                      <span style={{ fontSize: "11px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "9999px" }}>
                        Branch: {item.branch}
                      </span>
                    )}
                    {item.company && (
                      <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: "9999px" }}>
                        Company: {item.company}
                      </span>
                    )}
                    {item.department && (
                      <span style={{ fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "9999px" }}>
                        Dept: {item.department}
                      </span>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

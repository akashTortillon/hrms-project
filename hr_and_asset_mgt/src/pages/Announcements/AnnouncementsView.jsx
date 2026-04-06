import { useEffect, useState } from "react";
import { announcementService } from "../../services/announcementService";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";
import "../../style/Announcements.css";

export default function AnnouncementsView() {
  const { hasPermission } = useRole();
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", category: "GENERAL", audience: "ALL" });

  const loadData = async () => {
    try {
      setAnnouncements(await announcementService.getAll());
    } catch {
      toast.error("Failed to load announcements");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createAnnouncement = async () => {
    try {
      await announcementService.create(form);
      setForm({ title: "", message: "", category: "GENERAL", audience: "ALL" });
      loadData();
      toast.success("Announcement published");
    } catch {
      toast.error("Failed to create announcement");
    }
  };

  const getCategoryLabel = (value) =>
    String(value || "GENERAL")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getCategoryClass = (value) => {
    switch (value) {
      case "BIRTHDAY":
        return "announcement-badge birthday";
      case "LEAVE_REMINDER":
        return "announcement-badge leave";
      case "HR_NOTIFICATION":
        return "announcement-badge hr";
      default:
        return "announcement-badge general";
    }
  };

  const formatAnnouncementDate = (value) => {
    if (!value) return "Recently published";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently published";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
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
              <input value="All Employees" disabled />
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

        <div className="announcements-list">
          {announcements.length === 0 ? (
            <div className="announcements-empty-state">
              <div className="announcements-empty-state__title">No announcements yet</div>
              <p>The first published update will appear here for employees and admins.</p>
            </div>
          ) : (
            announcements.map((item) => (
              <article key={item._id} className="announcement-card">
                <div className="announcement-card__top">
                  <div>
                    <div className="announcement-card__title">{item.title}</div>
                    <div className="announcement-card__meta">{formatAnnouncementDate(item.createdAt)}</div>
                  </div>
                  <span className={getCategoryClass(item.category)}>{getCategoryLabel(item.category)}</span>
                </div>

                <p className="announcement-card__message">{item.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

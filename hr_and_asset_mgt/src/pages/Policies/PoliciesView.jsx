import { useEffect, useState } from "react";
import { policyService } from "../../services/policyService";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext.jsx";
import "../../style/Policies.css";

export default function PoliciesView() {
  const { hasPermission } = useRole();
  const [policies, setPolicies] = useState([]);
  const [form, setForm] = useState({ title: "", category: "COMPANY_POLICY", description: "", file: null });

  const loadData = async () => {
    try {
      setPolicies(await policyService.getAll());
    } catch {
      toast.error("Failed to load policies");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uploadPolicy = async () => {
    if (!form.file) return toast.error("Please select a file");
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("category", form.category);
      data.append("description", form.description);
      data.append("file", form.file);
      await policyService.upload(data);
      setForm({ title: "", category: "COMPANY_POLICY", description: "", file: null });
      loadData();
      toast.success("Policy uploaded");
    } catch {
      toast.error("Failed to upload policy");
    }
  };

  const getCategoryLabel = (value) =>
    String(value || "COMPANY_POLICY")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getCategoryClass = (value) => {
    switch (value) {
      case "HR_POLICY":
        return "policy-badge hr";
      case "GUIDELINE":
        return "policy-badge guideline";
      default:
        return "policy-badge company";
    }
  };

  const formatUploadedDate = (value) => {
    if (!value) return "Available now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Available now";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="policies-page">
      <section className="policies-hero">
        <div>
          <span className="policies-hero__eyebrow">Knowledge Center</span>
          <h2>Policies</h2>
          <p>Company policies, HR policies, and internal guidelines in a cleaner, more premium library view.</p>
        </div>

        <div className="policies-hero__stats">
          <div className="policies-stat-card">
            <span className="policies-stat-card__label">Total Documents</span>
            <strong className="policies-stat-card__value">{policies.length}</strong>
          </div>
          <div className="policies-stat-card">
            <span className="policies-stat-card__label">Latest Category</span>
            <strong className="policies-stat-card__value">
              {policies[0] ? getCategoryLabel(policies[0].category) : "Company Policy"}
            </strong>
          </div>
        </div>
      </section>

      {hasPermission("MANAGE_POLICIES") && (
        <section className="policy-uploader">
          <div className="policy-uploader__header">
            <div>
              <span className="policy-uploader__eyebrow">Document Publisher</span>
              <h3>Upload Policy</h3>
              <p>Keep internal guidance structured and accessible for employees, HR, and admin teams.</p>
            </div>
            <div className="policy-uploader__pill">Employee Access Enabled</div>
          </div>

          <div className="policy-uploader__grid">
            <div className="policy-field policy-field--full">
              <label>Policy Title</label>
              <input
                placeholder="Enter policy title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="policy-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="COMPANY_POLICY">Company Policy</option>
                <option value="HR_POLICY">HR Policy</option>
                <option value="GUIDELINE">Guideline</option>
              </select>
            </div>

            <div className="policy-field">
              <label>Attachment</label>
              <div className="policy-file-input">
                <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
                <span>{form.file?.name || "Choose policy file"}</span>
              </div>
            </div>

            <div className="policy-field policy-field--full">
              <label>Description</label>
              <textarea
                placeholder="Write a short description of this document"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <div className="policy-uploader__actions">
            <button
              className="policy-upload-btn"
              onClick={uploadPolicy}
              disabled={!form.title.trim() || !form.file}
            >
              Upload Policy
            </button>
          </div>
        </section>
      )}

      <section className="policies-library">
        <div className="policies-library__header">
          <div>
            <span className="policies-library__eyebrow">Document Library</span>
            <h3>Available Policies</h3>
          </div>
          <div className="policies-library__count">{policies.length} file{policies.length === 1 ? "" : "s"}</div>
        </div>

        <div className="policies-list">
          {policies.length === 0 ? (
            <div className="policies-empty-state">
              <div className="policies-empty-state__title">No policy documents yet</div>
              <p>Uploaded company and HR policies will appear here for easy access.</p>
            </div>
          ) : (
            policies.map((policy) => (
              <a
                key={policy._id}
                href={policy.fileUrl || policy.filePath}
                target="_blank"
                rel="noreferrer"
                className="policy-card"
              >
                <div className="policy-card__top">
                  <div>
                    <div className="policy-card__title">{policy.title}</div>
                    <div className="policy-card__meta">{formatUploadedDate(policy.createdAt)}</div>
                  </div>
                  <span className={getCategoryClass(policy.category)}>{getCategoryLabel(policy.category)}</span>
                </div>
                <p className="policy-card__description">{policy.description || "Open this document to view the full policy details."}</p>
                <div className="policy-card__cta">Open Document</div>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

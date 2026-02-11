import "../../style/Document.css";
import SvgIcon from "../../components/svgIcon/svgView";

const StatusBadge = ({ status }) => {
  const map = {
    Valid: "grid-status-valid",
    "Expiring Soon": "grid-status-warning",
    Critical: "grid-status-critical",
  };

  return (
    <span className={`grid-status ${map[status]}`}>
      {status}
    </span>
  );
};


const getFileUrl = (path) => {
  if (!path) return "#";
  const backendUrl = import.meta.env.VITE_API_BASE.replace("/api", "");
  return `${backendUrl}/${path}`;
};

const handleDownload = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed", error);
  }
};

const DocumentsGrid = ({ documents = [] }) => {
  return (
    <div className="documents-grid">
      {documents.map((doc) => (
        <div key={doc.id} className="document-card">
          {/* Header */}
          <div className="card-header">
            <div className="doc-icon">
              <SvgIcon name="document" size={22} />
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {/* Title */}
          <h3 className="card-title">{doc.title}</h3>
          <p className="card-location">{doc.location}</p>

  {/* Details */}
<div className="card-meta">
  <div className="meta-row">
    <span className="meta-label">Type</span>
    <span className="meta-value">{doc.type}</span>
  </div>

  <div className="meta-row">
    <span className="meta-label">Expiry</span>
    <span className="meta-value">{doc.expiryDate}</span>
  </div>

  <div className="meta-row">
    <span className="meta-label">Days Left</span>
    <span
      className={`meta-value ${
        doc.daysLeft <= 10 ? "danger" : ""
      }`}
    >
      {doc.daysLeft}
    </span>
  </div>

  {/* <div className="meta-row">
    <span className="meta-label">Size</span>
    <span className="meta-value">{doc.size}</span>
  </div> */}
</div>

{/* Divider */}
<div className="card-divider" />

{/* Actions */}
<div className="card-actions">
  <button className="btn-view">View</button>
  <button 
    className="btn-download"
    onClick={() => {
      const url = getFileUrl(doc.filePath);
      const ext = doc.filePath?.split('.').pop() || 'pdf';
      const filename = `${doc.title}.${ext}`;
      handleDownload(url, filename);
    }}
  >
    Download
  </button>
</div>


        </div>
      ))}
    </div>
  );
};

export default DocumentsGrid;

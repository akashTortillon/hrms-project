import DataTable from "../../components/reusable/DataTable.jsx";
import "../../style/Document.css";
import SvgIcon from "../../components/svgIcon/svgView.jsx";

const StatusBadge = ({ status }) => {
  const map = {
    Valid: "status-valid",
    "Expiring Soon": "status-warning",
    Critical: "status-critical",
  };

  return (
    <span className={`status-badge ${map[status]}`}>
      {status}
    </span>
  );
};

const DocumentsTable = ({ documents = [], onDelete }) => {
  const getFileUrl = (path) => {
    if (!path) return "#";
    // Ensure correct URL construction. Backend serves uploads at /uploads
    // path from DB is like "uploads/file.pdf"
    const backendUrl = import.meta.env.VITE_API_BASE.replace("/api", "");
    // If VITE_API_BASE is "http://localhost:5000/api", then we want "http://localhost:5000"
    // But currently check your .env. Likely http://localhost:5000/api

    // Safer way: assume VITE_API_BASE is just the base, e.g. http://localhost:5000
    // If path is "uploads/foo.pdf", we want http://localhost:5000/uploads/foo.pdf

    // Let's assume path is relative.
    return `${import.meta.env.VITE_API_BASE.replace('/api', '')}/${path}`;
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

  const columns = [
    {
      key: "document",
      header: "DOCUMENT",
      width: "28%",
      render: (row) => (
        <div className="doc-info">
          <div className="doc-icon">
            <SvgIcon name="document (1)" size={20} />
          </div>
          <div>
            <div className="doc-title">{row.title}</div>
            <div className="doc-sub">{row.type}</div>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "COMPANY / LOCATION",
      width: "18%",
      render: (row) => (
        <>
          <div className="primary">{row.location}</div>
          <div className="secondary">{row.department}</div>
        </>
      ),
    },
    {
      key: "issueDate",
      header: "ISSUE DATE",
      width: "12%",
      render: (row) => row.issueDate,
    },
    {
      key: "expiryDate",
      header: "EXPIRY DATE",
      width: "14%",
      render: (row) => (
        <>
          <div className="primary">{row.expiryDate}</div>
          {row.daysLeft !== undefined && row.daysLeft !== null && (
            <div className="secondary" style={{
              color: row.daysLeft < 0 ? 'var(--destructive)' : row.daysLeft <= 30 ? 'var(--warning-dark)' : 'inherit'
            }}>
              {row.daysLeft} days left
            </div>
          )}
        </>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      width: "14%",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "14%",
      render: (row) => (
        <div className="action-icons">
          <a
            href={getFileUrl(row.filePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="primary"
            style={{ cursor: 'pointer' }}
            title="View"
          >
            <SvgIcon name="eye" size={18} />
          </a>

          <span
            onClick={() => {
              const url = getFileUrl(row.filePath);
              // Extract extension or default to .pdf
              const ext = row.filePath?.split('.').pop() || 'pdf';
              const filename = `${row.title}.${ext}`;
              handleDownload(url, filename);
            }}
            className="success"
            style={{ cursor: 'pointer' }}
            title="Download"
          >
            <SvgIcon name="download" size={18} />
          </span>

          <span
            className="danger"
            onClick={() => onDelete(row._id || row.id)}
            style={{ cursor: 'pointer' }}
            title="Delete"
          >
            <SvgIcon name="delete" size={18} />
          </span>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={documents} />;
};

export default DocumentsTable;

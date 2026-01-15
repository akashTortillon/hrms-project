import React from "react";
import "../../style/Document.css";
import SvgIcon from "../../components/svgIcon/svgView.jsx";

const DocumentsFilter = ({
  search = "",
  onSearchChange,
  type = "All Types",
  status = "All Status",
  onTypeChange,
  onStatusChange,
  total = 0,
  view = "list",
  onViewChange,
  typeOptions = ["All Types"],
  statusOptions = ["All Status"]
}) => {
  return (
    <div className="documents-filter">
      {/* Top Controls */}
      <div className="filter-controls">
        {/* Search */}
        <div className="search-box">
          <SvgIcon name="search" size={18} />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Type Filter */}
        <select value={type} onChange={(e) => onTypeChange(e.target.value)}>
          {typeOptions.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
          {statusOptions.map((opt, idx) => (
            <option key={idx} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Bottom Info */}
      <div className="filter-footer">
        <span className="count-text">
          Showing {total} of {total} documents
        </span>

        <div className="view-toggle">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => onViewChange("list")}
          >
            List
          </button>
          <button
            className={view === "grid" ? "active" : ""}
            onClick={() => onViewChange("grid")}
          >
            Grid
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsFilter;

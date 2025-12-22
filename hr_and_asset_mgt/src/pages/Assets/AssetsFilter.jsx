
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";

const AssetsFilters = ({
  search,
  setSearch,
  type,
  setType,
  status,
  setStatus,
  total = 0,
}) => {
  return (
    <div className="assets-filters-card">
      <div className="assets-filters">
        {/* Search */}
        <div className="assets-search">
          <SvgIcon name="search" size={18} />
          <input
            type="text"
            placeholder="Search assets by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type */}
        <select
          className="assets-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option>All Types</option>
          <option>IT Equipment</option>
          <option>Vehicles</option>
          <option>Furniture</option>
        </select>

        {/* Status */}
        <select
          className="assets-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>All Status</option>
          <option>In Use</option>
          <option>Under Maintenance</option>
          <option>Disposed</option>
        </select>

        {/* Export */}
        <button className="assets-export-btn">
          <SvgIcon name="download" size={16} />
          Export
        </button>
      </div>

      <div className="assets-count">
        Showing {total} of {total} assets
      </div>
    </div>
  );
};

export default AssetsFilters;




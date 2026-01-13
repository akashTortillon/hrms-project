import DataTable from "../../components/reusable/DataTable";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";

const AssetsTable = ({ assets, onEdit, onDelete }) => {
  const columns = [
    {
      key: "asset",
      header: "ASSET DETAILS",
      width: "26%",
      render: (row) => (
        <div className="asset-cell">
          <div className="asset-icon">
            <SvgIcon name="cube" size={18} />
          </div>
          <div>
            <div className="asset-name">{row.name}</div>
            <div className="asset-sub">
              {row.code} · {row.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "LOCATION",
      width: "16%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.location}</div>
          {row.subLocation && (
            <div className="cell-secondary">{row.subLocation}</div>
          )}
        </div>
      ),
    },
    {
      key: "custodian",
      header: "CUSTODIAN",
      width: "18%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.custodian}</div>
          {row.department && (
            <div className="cell-secondary">{row.department}</div>
          )}
        </div>
      ),
    },
    {
      key: "purchase",
      header: "PURCHASE INFO",
      width: "16%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.price}</div>
          <div className="cell-secondary">{row.purchaseDate}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      width: "12%",
      render: (row) => (
        <span className={`status-pill status-${row.statusKey}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "12%",
      render: (row) => (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {row.isDeleted ? (
            <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: "500" }}>Deleted</span>
          ) : (
            <div className="actions-btn">
              <button
                type="button"
                className="icon-btn edit-btn"
                onClick={() => onEdit && onEdit(row)}
                title="Edit Asset"
              >
                <SvgIcon name="edit" size={18} />
              </button>
              <button
                type="button"
                className="icon-btn delete-btn"
                onClick={() => onDelete && onDelete(row)}
                title="Delete Asset"
              >
                <SvgIcon name="delete" size={18} />
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={assets}
      rowKey="id"
      className="assets-table"
    />
  );
};

export default AssetsTable;

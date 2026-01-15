import SvgIcon from "../../../components/svgIcon/svgView";

// Reusable List Component
export const RenderList = ({ items, type, handleDelete, handleEdit }) => (
    <div className={`pill-list ${type === "Payroll Rule" ? "grid-view" : ""}`}>
        {items.length === 0 ? <p className="text-muted small">No items found.</p> : null}
        {items.map((item) => {
            // Check for metadata
            const meta = item.metadata || {};
            const isLeaveConfig = meta.type === 'LEAVE_CONFIG';

            return (
                <div key={item._id} className="structure-item">
                    <div className="item-content">
                        <span className="structure-name" style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>{item.name}</span>
                        {/* Show extra details for Payroll Rules */}
                        {type === "Payroll Rule" && (
                            <div className="item-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                {isLeaveConfig ? (
                                    <>
                                        <span className="item-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>{meta.days} Days</span>
                                        <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.4' }}>{item.description}</span>
                                    </>
                                ) : (
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.description}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="structure-actions">
                        <button className="icon-btn edit" onClick={() => handleEdit(type, item)}>
                            <SvgIcon name="edit" size={16} />
                        </button>
                        <button
                            className="icon-btn delete"
                            onClick={() => handleDelete(type, item._id)}
                        >
                            <SvgIcon name="delete" size={16} />
                        </button>
                    </div>
                </div>
            );
        })}
    </div>
);
import SvgIcon from "../../../components/svgIcon/svgView";

// Reusable List Component
export const RenderList = ({ items, type, handleDelete, handleEdit }) => (
    <div className="pill-list">
        {items.length === 0 ? <p className="text-muted small">No items found.</p> : null}
        {items.map((item) => (
            <div key={item._id} className="structure-item">
                <span className="structure-name">{item.name}</span>
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
        ))}
    </div>
);
import SvgIcon from "../../../components/svgIcon/svgView";

export const RenderVendorList = ({ items, assetTypes, handleEdit, handleDelete }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted small">No items found.</p>;
    }

    return (
        <div className="pill-list">
            {items.map((item) => {
                // Find linked Asset Type name if assetTypeId exists
                const linkedType = assetTypes?.find(t => t._id === item.assetTypeId);
                const typeName = linkedType ? linkedType.name : "General Vendor";

                // Construct simple subtitle line
                const descriptionText = item.description
                    ? (linkedType ? `${typeName} \u2022 ${item.description}` : item.description)
                    : typeName;

                return (
                    <div key={item._id} className="structure-item">
                        <div className="item-content">
                            <span className="structure-name">{item.name}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{descriptionText}</span>
                        </div>
                        <div className="structure-actions">
                            <button className="icon-btn edit" onClick={() => handleEdit("Vendor", item)}>
                                <SvgIcon name="edit" size={16} />
                            </button>
                            <button className="icon-btn delete" onClick={() => handleDelete("Vendor", item._id)}>
                                <SvgIcon name="delete" size={16} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

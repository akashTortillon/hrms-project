import SvgIcon from "../../../components/svgIcon/svgView";

export const RenderVendorList = ({ items, handleDelete, handleEdit }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted small">No items found.</p>;
    }

    return (
        <div className="flex flex-col gap-4">
            {items.map((item) => (
                <div key={item._id} className="p-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
                    <div>
                        <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                        {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                    </div>
                    <div className="flex gap-2">
                        <button className="icon-btn edit" onClick={() => handleEdit("Vendor", item)}>
                            <SvgIcon name="edit" size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={() => handleDelete("Vendor", item._id)}>
                            <SvgIcon name="delete" size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

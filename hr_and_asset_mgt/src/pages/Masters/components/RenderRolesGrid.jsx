import "../../../style/Masters.css";

// Mock Grid layout for "User Roles"
// Grid layout for "User Roles"
import CustomButton from "../../../components/reusable/Button.jsx";
import SvgIcon from "../../../components/svgIcon/svgView";

export const RenderRolesGrid = ({ items = [], handleEdit, handleDelete }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted small">No items found.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((role) => (
                <div key={role._id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-2">
                        <h5 className="text-sm font-semibold text-gray-900">{role.name}</h5>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit("Role", role)}
                                className="icon-btn edit text-blue-600 hover:text-blue-800"
                                title="Edit Role"
                            >
                                <SvgIcon name="edit" size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete("Role", role._id)}
                                className="icon-btn delete text-red-500 hover:text-red-700"
                                title="Delete Role"
                            >
                                <SvgIcon name="delete" size={16} />
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-2">
                        {role.permissions?.length > 0 ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-[10px]">
                                {role.permissions.length} Permissions
                            </span>
                        ) : (
                            <span className="text-gray-400 italic">No specific permissions</span>
                        )}
                    </p>

                </div>
            ))}
        </div>
    );
};

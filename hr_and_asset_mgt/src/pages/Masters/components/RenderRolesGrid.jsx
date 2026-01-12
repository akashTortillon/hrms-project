import "../../../style/Masters.css";

// Mock Grid layout for "User Roles"
// Grid layout for "User Roles"
export const RenderRolesGrid = ({ items = [] }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted small">No items found.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {items.map((role) => (
                <div key={role._id} className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">{role.name}</h5>
                    <p className="text-xs text-gray-500">{role.description}</p>
                </div>
            ))}
        </div>
    );
};

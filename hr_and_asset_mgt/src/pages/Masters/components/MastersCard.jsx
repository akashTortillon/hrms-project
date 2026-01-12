import "../../../style/Masters.css";

export default function MastersCard({ title, description, onAdd, headerAction, children, className = "" }) {
    return (
        <div className={`masters-card-container ${className}`}>
            <div className="masters-card-header-clean">
                <div className="flex flex-col gap-1">
                    <h4 className="masters-card-title">{title}</h4>
                    {description && <p className="text-sm text-gray-500 font-normal">{description}</p>}
                </div>
                {headerAction ? headerAction : (onAdd && (
                    <button className="masters-add-btn" onClick={onAdd}>
                        + Add
                    </button>
                ))}
            </div>
            <div className="masters-card-body">
                {children}
            </div>
        </div>
    );
}

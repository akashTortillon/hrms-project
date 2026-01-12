import "../../../style/Masters.css";

export default function MastersCard({ title, onAdd, children, className = "" }) {
    return (
        <div className={`masters-card-container ${className}`}>
            <div className="masters-card-header-clean">
                <h4 className="masters-card-title">{title}</h4>
                {onAdd && (
                    <button className="masters-add-btn" onClick={onAdd}>
                        + Add
                    </button>
                )}
            </div>
            <div className="masters-card-body">
                {children}
            </div>
        </div>
    );
}

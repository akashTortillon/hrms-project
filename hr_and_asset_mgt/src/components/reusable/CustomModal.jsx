import { useEffect } from "react";
import "../../style/Modal.css";

export default function CustomModal({ show, title, children, onClose, footer }) {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (show) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [show]);

    if (!show) return null;

    return (
        <div className="custom-modal-overlay">
            <div className="custom-modal">
                <div className="custom-modal-header">
                    <h3 className="custom-modal-title">{title}</h3>
                    <button className="custom-modal-close" onClick={onClose}>
                        &times;
                    </button>
                </div>
                <div className="custom-modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="custom-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

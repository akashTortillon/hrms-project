import { useEffect, useState } from "react";
import CustomModal from "./CustomModal.jsx";
import AppButton from "./Button.jsx";

// In-app PDF viewer used by payslip "View" and the payroll report exports.
// `fetchBlob` is an async fn returning the PDF Blob; it runs each time the modal
// opens, and the object URL is revoked on close so nothing leaks.
export default function PdfPreviewModal({ show, title = "Preview", fetchBlob, onClose, downloadFileName = "document.pdf" }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!show || !fetchBlob) return undefined;
        let cancelled = false;
        let objectUrl = "";
        setLoading(true);
        setError("");
        setUrl("");
        (async () => {
            try {
                const blob = await fetchBlob();
                if (cancelled) return;
                objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                setUrl(objectUrl);
            } catch (err) {
                if (!cancelled) setError(err?.message || "Failed to load the document.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // fetchBlob is intentionally not a dependency: callers pass a fresh closure each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const handleDownload = () => {
        if (!url) return;
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", downloadFileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    };

    return (
        <CustomModal
            show={show}
            title={title}
            onClose={onClose}
            width="980px"
            footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%" }}>
                    <AppButton variant="secondary" onClick={onClose}>Close</AppButton>
                    <AppButton variant="primary" onClick={handleDownload} disabled={!url}>Download PDF</AppButton>
                </div>
            )}
        >
            {loading && <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading preview…</div>}
            {error && <div style={{ padding: "24px", textAlign: "center", color: "#b91c1c" }}>{error}</div>}
            {url && (
                <iframe
                    title={title}
                    src={url}
                    style={{ width: "100%", height: "72vh", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff" }}
                />
            )}
        </CustomModal>
    );
}

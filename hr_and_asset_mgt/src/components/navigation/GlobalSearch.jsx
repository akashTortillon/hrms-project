import { useState, useEffect, useRef } from "react";
import { performGlobalSearch } from "../../services/searchService";
import { useNavigate } from "react-router-dom";
import SvgIcon from "../svgIcon/svgView";
import { Form } from "react-bootstrap";
import "./GlobalSearch.css"; // We will create this

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                fetchResults(query);
            } else {
                setResults(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchResults = async (q) => {
        setLoading(true);
        try {
            const res = await performGlobalSearch(q);
            if (res.success) {
                setResults(res.data);
                setShowResults(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (type, item) => {
        setShowResults(false);
        setQuery("");
        setResults(null);

        if (type === "employee") {
            navigate(`/app/employees/${item._id}`);
        } else if (type === "asset") {
            navigate(`/app/assets`, { state: { highlightId: item._id } }); // Assuming AssetView can handle this or just go to list
        } else if (type === "document") {
            navigate(`/app/documents`);
        }
    };

    const hasResults = results && (
        (results.employees && results.employees.length > 0) ||
        (results.assets && results.assets.length > 0) ||
        (results.documents && results.documents.length > 0)
    );

    return (
        <div className="global-search-container" ref={searchRef}>
            <Form style={{ width: "100%" }}>
                <div className="search-wrapper">
                    <div className="search-icon-inside">
                        <SvgIcon name="search" size={15} />
                    </div>
                    <Form.Control
                        type="search"
                        placeholder="Search employees, documents, assets..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => { if (results) setShowResults(true); }}
                        className="search-input"
                    />
                    {loading && <div className="spinner-border spinner-border-sm text-secondary search-spinner" role="status"></div>}
                </div>
            </Form>

            {showResults && results && (
                <div className="search-dropdown-menu">
                    {!hasResults && !loading && (
                        <div className="search-no-results">No results found</div>
                    )}

                    {/* Employees */}
                    {results.employees?.length > 0 && (
                        <div className="search-section">
                            <h6 className="search-section-title">Employees</h6>
                            {results.employees.map(emp => (
                                <div key={emp._id} className="search-item" onClick={() => handleSelect('employee', emp)}>
                                    <div className="search-item-icon"><SvgIcon name="user" size={14} /></div>
                                    <div className="search-item-info">
                                        <div className="search-item-title">{emp.name}</div>
                                        <div className="search-item-sub">{emp.code} • {emp.department}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Assets */}
                    {results.assets?.length > 0 && (
                        <div className="search-section">
                            <h6 className="search-section-title">Assets</h6>
                            {results.assets.map(asset => (
                                <div key={asset._id} className="search-item" onClick={() => handleSelect('asset', asset)}>
                                    <div className="search-item-icon"><SvgIcon name="cube" size={14} /></div>
                                    <div className="search-item-info">
                                        <div className="search-item-title">{asset.name}</div>
                                        <div className="search-item-sub">{asset.assetCode} • {asset.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Documents */}
                    {results.documents?.length > 0 && (
                        <div className="search-section">
                            <h6 className="search-section-title">Documents</h6>
                            {results.documents.map(doc => (
                                <div key={doc._id} className="search-item" onClick={() => handleSelect('document', doc)}>
                                    <div className="search-item-icon"><SvgIcon name="document" size={14} /></div>
                                    <div className="search-item-info">
                                        <div className="search-item-title">{doc.name || doc.type}</div>
                                        <div className="search-item-sub">{doc.category} Document</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

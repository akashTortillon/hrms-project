import React from 'react';
import '../../style/Pagination.css'; // We will create this too or use inline styles for now

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    limit,
    onLimitChange
}) => {
    if (totalPages <= 1 && totalRecords === 0) return null;

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                <span>Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRecords)} of {totalRecords} entries</span>
            </div>

            <div className="pagination-controls">
                <div className="limit-selector">
                    <label>Rows per page:</label>
                    <select
                        value={limit}
                        onChange={(e) => onLimitChange(Number(e.target.value))}
                        className="limit-select"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Previous
                </button>

                <span className="page-number">
                    Page {currentPage} of {totalPages}
                </span>

                <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;

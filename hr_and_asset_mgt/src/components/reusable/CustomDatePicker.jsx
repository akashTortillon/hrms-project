import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './CustomDatePicker.css';

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDatePicker({
    value,
    onChange,
    name,
    placeholder = "dd-mm-yyyy",
    className = "",
    disabled = false,
    minDate,
    maxDate
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Parse initial date or default to today
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const [currentDate, setCurrentDate] = useState(parseDate(value)); // Calendar view date
    const [viewYear, setViewYear] = useState(currentDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(currentDate.getMonth());

    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync internal state if value changes externally
    useEffect(() => {
        const d = parseDate(value);
        setCurrentDate(d);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const updatePosition = () => {
        if (buttonRef.current && isOpen) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    };

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            updatePosition();
            // Reset view to selected date when opening
            const d = parseDate(value);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
        setIsOpen(!isOpen);
        // Use timeout to ensure ref is ready for initial positioning
        setTimeout(updatePosition, 0);
    };

    const generateDays = () => {
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(viewYear, viewMonth, i));
        }

        return days;
    };

    const handleDateClick = (date) => {
        if (!date) return;
        // Format YYYY-MM-DD for standard input compatibility
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;

        onChange({ target: { name, value: formatted } }); // Mimic event object
        setIsOpen(false);
    };

    const handleYearChange = (e) => {
        setViewYear(parseInt(e.target.value));
    };

    const handleMonthChange = (e) => {
        setViewMonth(parseInt(e.target.value));
    };

    // Generate year options (100 years back, 10 years forward)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 110 }, (_, i) => currentYear - 100 + i).reverse();

    // Helper to check if date is selected
    const isSelected = (date) => {
        if (!value || !date) return false;
        const d = new Date(value);
        return date.getDate() === d.getDate() &&
            date.getMonth() === d.getMonth() &&
            date.getFullYear() === d.getFullYear();
    };

    // Format display value
    const displayValue = value ? new Date(value).toLocaleDateString('en-GB') : ""; // DD/MM/YYYY

    return (
        <div className={`custom-datepicker-wrapper ${className}`} ref={buttonRef}>
            <div
                className={`custom-datepicker-input ${disabled ? 'disabled' : ''}`}
                onClick={toggleOpen}
            >
                <span className={!value ? "placeholder" : ""}>
                    {displayValue || placeholder}
                </span>
                <span className="calendar-icon">📅</span>
            </div>

            {isOpen && ReactDOM.createPortal(
                <div
                    className="custom-datepicker-portal"
                    ref={dropdownRef}
                    style={{
                        top: coords.top + 5,
                        left: coords.left,
                        minWidth: '300px' // Ensure minimum width for calendar
                    }}
                >
                    <div className="datepicker-header">
                        <select value={viewMonth} onChange={handleMonthChange} onClick={(e) => e.stopPropagation()}>
                            {MONTH_NAMES.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <select value={viewYear} onChange={handleYearChange} onClick={(e) => e.stopPropagation()}>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="datepicker-weekdays">
                        {DAYS.map(d => <span key={d}>{d}</span>)}
                    </div>

                    <div className="datepicker-grid">
                        {generateDays().map((date, i) => (
                            <button
                                key={i}
                                className={`day-btn ${!date ? 'empty' : ''} ${isSelected(date) ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateClick(date);
                                }}
                                disabled={!date}
                            >
                                {date ? date.getDate() : ''}
                            </button>
                        ))}
                    </div>

                    <div className="datepicker-footer">
                        <button
                            className="today-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                const now = new Date();
                                setViewMonth(now.getMonth());
                                setViewYear(now.getFullYear());
                            }}
                        >
                            Today
                        </button>
                        <button
                            className="clear-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange({ target: { name, value: "" } });
                                setIsOpen(false);
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

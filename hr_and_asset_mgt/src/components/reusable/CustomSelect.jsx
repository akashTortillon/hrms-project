import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './CustomSelect.css';

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    className = '',
    name = '',
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Close logic
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        // const handleScroll = () => {
        //     if (isOpen) setIsOpen(false);
        // };

        const handleScroll = (e) => {
    if (
        dropdownRef.current &&
        dropdownRef.current.contains(e.target)
    ) {
        return; // Allow scrolling inside dropdown
    }

    if (isOpen) setIsOpen(false);
};

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true); // Capture scroll to close on scroll
        window.addEventListener('resize', handleScroll);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const selectedOption = options.find(opt => opt.value === value);

    const dropdown = (
        // <div
        //     className="custom-select-dropdown-portal"
        //     ref={dropdownRef}
        //     style={{
        //         top: coords.top,
        //         left: coords.left,
        //         width: coords.width,
        //     }}
        // >
        <div
    className="custom-select-dropdown-portal"
    ref={dropdownRef}
    onWheel={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    style={{
        top: coords.top,
        left: coords.left,
        width: coords.width,
    }}
>
            {options.map((option) => (
                <div
                    key={option.value}
                    className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                >
                    {option.label}
                </div>
            ))}
        </div>
    );

    return (
        <div className={`custom-select ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                className="custom-select-button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                name={name}
            >
                <span>{selectedOption?.label || placeholder}</span>
                <svg className={`custom-select-arrow ${isOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="2" />
                </svg>
            </button>

            {isOpen && ReactDOM.createPortal(dropdown, document.body)}
        </div>
    );
}

import React, { memo, useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const getOptionValue = (opt) => (opt && typeof opt === 'object' ? opt.value : opt);
  const getOptionLabel = (opt) => (opt && typeof opt === 'object' ? opt.label : opt);

  const selectedOption = options.find(opt => String(getOptionValue(opt)) === String(value));
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : null;

  const toggleOpen = (e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = (e) => {
      // Only close if click is OUTSIDE the wrapper (trigger + dropdown)
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClose);
    };
  }, [isOpen]);

  return (
    <div className="custom-select-wrapper pos-relative w-full" ref={wrapperRef}>
      <div
        className={`form-input custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={toggleOpen}
      >
        <span className={`custom-select-text ${displayValue ? 'selected' : 'placeholder'}`}>
          {displayValue || placeholder || 'Select an option...'}
        </span>
        <ChevronDown
          size={18}
          className={`custom-select-chevron ${isOpen ? 'open' : ''}`}
        />
      </div>

      {isOpen && (
        <div
          className="custom-select-dropdown hide-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt, index) => {
            const val = getOptionValue(opt);
            const lbl = getOptionLabel(opt);
            const isSelected = String(value) === String(val);

            return (
              <div
                key={index}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(val);
                  setIsOpen(false);
                }}
              >
                {lbl}
                {isSelected && <div className="custom-select-dot" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(CustomSelect);

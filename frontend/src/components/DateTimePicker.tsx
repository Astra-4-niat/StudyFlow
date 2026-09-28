import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronDown, X, AlertCircle } from 'lucide-react';
import { formatDateTimeDisplay } from '../utils/helpers';

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n: number) => String(n).padStart(2, '0');

const to24Hour = (hour12: number, period: 'AM' | 'PM'): number => {
  if (period === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
};

const to12Hour = (hour24: number): { hour12: number; period: 'AM' | 'PM' } => {
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
};

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select deadline',
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null);

  // Draft state while picker is open
  const [draftDate, setDraftDate] = useState<Date>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const [viewYear, setViewYear] = useState<number>(draftDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(draftDate.getMonth());

  const [draftHour, setDraftHour] = useState<number>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return to12Hour(d.getHours()).hour12;
    }
    return 5; // Default 5:00 PM
  });

  const [draftMinute, setDraftMinute] = useState<number>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return Math.floor(d.getMinutes() / 5) * 5;
    }
    return 0;
  });

  const [draftPeriod, setDraftPeriod] = useState<'AM' | 'PM'>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return to12Hour(d.getHours()).period;
    }
    return 'PM';
  });

  // Calculate popover positioning relative to trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth <= 640;

    if (isMobile) {
      setPopoverPos(null);
      return;
    }

    const popoverWidth = 340;
    const popoverHeight = 440;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    left = Math.max(16, left);

    const top = placeAbove ? rect.top - popoverHeight - 8 : rect.bottom + 8;

    setPopoverPos({
      top,
      left,
      width: popoverWidth,
      placeAbove,
    });
  }, []);

  // Sync draft state whenever picker opens
  useEffect(() => {
    if (isOpen) {
      let initialDate: Date;
      let initialHour = 5;
      let initialMin = 0;
      let initialPeriod: 'AM' | 'PM' = 'PM';

      if (value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          initialDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const h12 = to12Hour(d.getHours());
          initialHour = h12.hour12;
          initialMin = Math.floor(d.getMinutes() / 5) * 5;
          initialPeriod = h12.period;
        } else {
          const now = new Date();
          initialDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
      } else {
        const now = new Date();
        initialDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Default to a future time if today
        const nextHour = now.getHours() + 1;
        if (nextHour >= 24) {
          initialDate.setDate(initialDate.getDate() + 1);
          initialHour = 9;
          initialPeriod = 'AM';
        } else {
          const h12 = to12Hour(nextHour);
          initialHour = h12.hour12;
          initialPeriod = h12.period;
        }
      }

      setDraftDate(initialDate);
      setViewYear(initialDate.getFullYear());
      setViewMonth(initialDate.getMonth());
      setDraftHour(initialHour);
      setDraftMinute(initialMin);
      setDraftPeriod(initialPeriod);

      updatePosition();
    }
  }, [isOpen, value, updatePosition]);

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Date math
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const hour24 = to24Hour(draftHour, draftPeriod);
  const draftDateTime = new Date(
    draftDate.getFullYear(),
    draftDate.getMonth(),
    draftDate.getDate(),
    hour24,
    draftMinute,
    0
  );

  const isSelectedDateToday = draftDate.getTime() === today.getTime();
  const isTimeInPast = isSelectedDateToday && draftDateTime.getTime() < now.getTime();

  // Navigation handlers
  const canGoPrevMonth = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canGoPrevMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Quick selections
  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const d = new Date(today);
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
    }

    setDraftDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());

    // If setting to today and current time is in the past, auto advance to next hour
    if (type === 'today') {
      const currentNextHour = now.getHours() + 1;
      if (currentNextHour < 24) {
        const h12 = to12Hour(currentNextHour);
        setDraftHour(h12.hour12);
        setDraftPeriod(h12.period);
      }
    }
  };

  // Quick preset active check
  const isQuickActive = (type: 'today' | 'tomorrow' | 'nextWeek'): boolean => {
    const d = new Date(today);
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    if (type === 'nextWeek') d.setDate(d.getDate() + 7);
    return draftDate.getTime() === d.getTime();
  };

  // Calendar cell builder
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Monday = 0

  const calendarDays: Array<{
    dayNumber: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    isPast: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const cellDate = new Date(y, m, day);
    calendarDays.push({
      dayNumber: day,
      month: m,
      year: y,
      isCurrentMonth: false,
      isPast: cellDate.getTime() < today.getTime(),
      isToday: cellDate.getTime() === today.getTime(),
      isSelected: cellDate.getTime() === draftDate.getTime(),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(viewYear, viewMonth, day);
    calendarDays.push({
      dayNumber: day,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      isPast: cellDate.getTime() < today.getTime(),
      isToday: cellDate.getTime() === today.getTime(),
      isSelected: cellDate.getTime() === draftDate.getTime(),
    });
  }

  // Next month leading days (fill row to complete 35 or 42 cells)
  const totalCells = calendarDays.length <= 35 ? 35 : 42;
  const trailingNeeded = totalCells - calendarDays.length;
  for (let day = 1; day <= trailingNeeded; day++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const cellDate = new Date(y, m, day);
    calendarDays.push({
      dayNumber: day,
      month: m,
      year: y,
      isCurrentMonth: false,
      isPast: false,
      isToday: cellDate.getTime() === today.getTime(),
      isSelected: cellDate.getTime() === draftDate.getTime(),
    });
  }

  const handleSelectDay = (cell: typeof calendarDays[0]) => {
    if (cell.isPast) return;
    const newDate = new Date(cell.year, cell.month, cell.dayNumber);
    setDraftDate(newDate);
    if (!cell.isCurrentMonth) {
      setViewMonth(cell.month);
      setViewYear(cell.year);
    }
  };

  const handleApply = () => {
    if (isTimeInPast) return;
    const y = draftDate.getFullYear();
    const m = pad(draftDate.getMonth() + 1);
    const d = pad(draftDate.getDate());
    const h = pad(hour24);
    const min = pad(draftMinute);
    const formatted = `${y}-${m}-${d}T${h}:${min}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  // Quick fix for past time
  const handleAutoAdjustTime = () => {
    const nextHour = now.getHours() + 1;
    if (nextHour >= 24) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDraftDate(tomorrow);
      setViewMonth(tomorrow.getMonth());
      setViewYear(tomorrow.getFullYear());
      setDraftHour(9);
      setDraftPeriod('AM');
    } else {
      const h12 = to12Hour(nextHour);
      setDraftHour(h12.hour12);
      setDraftPeriod(h12.period);
      setDraftMinute(0);
    }
  };

  const popoverContent = (
    <div
      ref={popoverRef}
      className={`datetime-popover ${popoverPos?.placeAbove ? 'datetime-popover--above' : ''}`}
      style={
        popoverPos
          ? {
              position: 'fixed',
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
            }
          : undefined
      }
      onClick={e => e.stopPropagation()}
    >
      {/* Mobile Header */}
      <div className="datetime-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <CalendarIcon size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>Set Deadline</span>
        </div>
        <button
          type="button"
          className="modal-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close picker"
        >
          <X size={18} />
        </button>
      </div>

      {/* Quick Select Buttons */}
      <div className="datetime-quick-row">
        <button
          type="button"
          className={`datetime-quick-pill ${isQuickActive('today') ? 'datetime-quick-pill--active' : ''}`}
          onClick={() => handleQuickSelect('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={`datetime-quick-pill ${isQuickActive('tomorrow') ? 'datetime-quick-pill--active' : ''}`}
          onClick={() => handleQuickSelect('tomorrow')}
        >
          Tomorrow
        </button>
        <button
          type="button"
          className={`datetime-quick-pill ${isQuickActive('nextWeek') ? 'datetime-quick-pill--active' : ''}`}
          onClick={() => handleQuickSelect('nextWeek')}
        >
          Next Week
        </button>
      </div>

      {/* Month Navigation */}
      <div className="datetime-month-header">
        <span className="datetime-month-title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="datetime-nav-btn"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="datetime-nav-btn"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="datetime-weekdays-grid">
        {WEEKDAYS.map(w => (
          <span key={w} className="datetime-weekday-label">{w}</span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="datetime-calendar-grid">
        {calendarDays.map((cell, idx) => {
          let cellClass = 'datetime-day-btn';
          if (!cell.isCurrentMonth) cellClass += ' datetime-day-btn--outside';
          if (cell.isPast) cellClass += ' datetime-day-btn--past';
          if (cell.isToday) cellClass += ' datetime-day-btn--today';
          if (cell.isSelected) cellClass += ' datetime-day-btn--selected';

          return (
            <button
              key={`${cell.year}-${cell.month}-${cell.dayNumber}-${idx}`}
              type="button"
              className={cellClass}
              onClick={() => handleSelectDay(cell)}
              disabled={cell.isPast}
              aria-label={`${cell.dayNumber} ${MONTH_NAMES[cell.month]} ${cell.year}`}
              aria-selected={cell.isSelected}
            >
              {cell.dayNumber}
            </button>
          );
        })}
      </div>

      {/* Time Selection */}
      <div className="datetime-time-section">
        <div className="datetime-time-label">
          <Clock size={14} style={{ color: 'var(--accent)' }} />
          <span>Time</span>
        </div>

        <div className="datetime-time-controls">
          {/* Hour Selector */}
          <div className="datetime-select-wrapper">
            <select
              className="datetime-select"
              value={draftHour}
              onChange={e => setDraftHour(parseInt(e.target.value))}
              aria-label="Select hour"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </select>
          </div>

          <span className="datetime-time-separator">:</span>

          {/* Minute Selector */}
          <div className="datetime-select-wrapper">
            <select
              className="datetime-select"
              value={draftMinute}
              onChange={e => setDraftMinute(parseInt(e.target.value))}
              aria-label="Select minute"
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </select>
          </div>

          {/* AM / PM Segmented Toggle */}
          <div className="datetime-period-toggle">
            <button
              type="button"
              className={`datetime-period-btn ${draftPeriod === 'AM' ? 'datetime-period-btn--active' : ''}`}
              onClick={() => setDraftPeriod('AM')}
            >
              AM
            </button>
            <button
              type="button"
              className={`datetime-period-btn ${draftPeriod === 'PM' ? 'datetime-period-btn--active' : ''}`}
              onClick={() => setDraftPeriod('PM')}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Warning if today & time in past */}
      {isTimeInPast && (
        <div className="datetime-past-warning">
          <AlertCircle size={14} />
          <span>Selected time is in the past.</span>
          <button
            type="button"
            className="datetime-adjust-btn"
            onClick={handleAutoAdjustTime}
          >
            Adjust
          </button>
        </div>
      )}

      {/* Popover Actions */}
      <div className="datetime-actions-row">
        <div>
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClear}
              style={{ color: 'var(--text-muted)', fontSize: 13 }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleApply}
            disabled={isTimeInPast}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="datetime-picker-wrapper">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`datetime-trigger ${isOpen ? 'datetime-trigger--open' : ''} ${value ? 'datetime-trigger--has-value' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
          }
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="datetime-trigger-left">
          <CalendarIcon size={16} className="datetime-trigger-icon" />
          <span className={`datetime-trigger-text ${!value ? 'datetime-trigger-placeholder' : ''}`}>
            {value ? formatDateTimeDisplay(value) : placeholder}
          </span>
        </div>

        <div className="datetime-trigger-right">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="datetime-clear-trigger"
              onClick={handleClear}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
                }
              }}
              title="Clear deadline"
              aria-label="Clear deadline"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={15} className={`datetime-chevron ${isOpen ? 'datetime-chevron--open' : ''}`} />
        </div>
      </button>

      {/* Render Popover via Portal */}
      {isOpen &&
        createPortal(
          <div
            className="datetime-portal-backdrop"
            onClick={() => setIsOpen(false)}
          >
            {popoverContent}
          </div>,
          document.body
        )}
    </div>
  );
};

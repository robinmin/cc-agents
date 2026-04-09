import { useState, useRef, useEffect } from 'react';

export type SortOption = 'wbs-asc' | 'wbs-desc' | 'created-asc' | 'created-desc' | 'updated-asc' | 'updated-desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'wbs-desc', label: 'WBS Desc (default)' },
    { value: 'wbs-asc', label: 'WBS Asc' },
    { value: 'created-desc', label: 'Created ↓' },
    { value: 'created-asc', label: 'Created ↑' },
    { value: 'updated-desc', label: 'Modified ↓' },
    { value: 'updated-asc', label: 'Modified ↑' },
];

export interface SortDropdownProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const _selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) ?? SORT_OPTIONS[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors"
                style={{
                    background: 'var(--kanban-bg)',
                    borderColor: 'var(--kanban-border)',
                    color: 'var(--kanban-text-secondary)',
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>Sort</span>
                <span className="text-[10px]">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
                <div
                    role="listbox"
                    className="absolute right-0 z-50 mt-1 py-1 rounded-md shadow-lg border min-w-[140px]"
                    style={{
                        background: 'var(--kanban-card)',
                        borderColor: 'var(--kanban-border)',
                    }}
                >
                    {SORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={opt.value === value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs transition-colors"
                            style={{
                                background: opt.value === value ? 'var(--kanban-bg)' : 'transparent',
                                color: opt.value === value ? 'var(--kanban-text)' : 'var(--kanban-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                                if (opt.value !== value) {
                                    e.currentTarget.style.background = 'var(--kanban-bg)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (opt.value !== value) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

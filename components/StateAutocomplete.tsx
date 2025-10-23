import React, { useEffect, useState, useRef } from 'react';
import citiesJson from '../cities_all.json';

type StateItem = { code?: string; name?: string };

type Props = {
    value?: string;
    onChange: (value: string) => void;
    onSelect?: (name: string, code?: string) => void;
    placeholder?: string;
    required?: boolean;
};

const normalize = (s: string) =>
    s
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

const StateAutocomplete: React.FC<Props> = ({ value = '', onChange, onSelect, placeholder, required }) => {
    const [states, setStates] = useState<StateItem[]>([]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const [filtered, setFiltered] = useState<StateItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
        const data = (citiesJson as any)?.results || (citiesJson as any) || [];
        // Extrair estados únicos
        const map: Record<string, StateItem> = {};
        (data as any[]).forEach((c) => {
            const s = c.state || {};
            const key = (s.code || s.name || '').toString();
            if (key) map[key] = { code: s.code, name: s.name };
        });
        const list = Object.values(map).sort((a, b) => (a.code || a.name || '').localeCompare(b.code || b.name || ''));
        setStates(list);
    }, []);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        if (!query) {
            setFiltered([]);
            return;
        }
        const q = normalize(query);
        const results = states.filter((s) => normalize(s.code || s.name || '').includes(q)).slice(0, 20);
        setFiltered(results);
        setActiveIndex(-1);
    }, [query, states]);

    const handleInput = (v: string) => {
        setQuery(v);
        onChange(v);
        setOpen(true);
    };

    const handleSelect = (s: StateItem) => {
        const display = s.code || s.name || '';
        setQuery(display);
        onChange(display);
        setOpen(false);
        onSelect?.(display, s.code);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && filtered[activeIndex]) handleSelect(filtered[activeIndex]);
            else setOpen(false);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    required={required}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 pl-3 pr-10"
                />
                <button
                    type="button"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setOpen((o) => !o);
                        inputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label="toggle states"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500 dark:text-gray-300">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {open && filtered.length > 0 && (
                <ul ref={listRef} className="absolute z-50 w-full max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg">
                    {filtered.map((s, idx) => (
                        <li
                            key={s.code || s.name}
                            onMouseDown={(ev) => {
                                ev.preventDefault();
                                handleSelect(s);
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        >
                            <div className="text-sm text-gray-900 dark:text-gray-100">{s.code || s.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{s.name && s.code ? s.name : ''}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default StateAutocomplete;

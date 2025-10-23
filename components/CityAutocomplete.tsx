import React, { useState, useEffect, useRef } from 'react';
// Static import to guarantee availability and avoid runtime 404 in dev
import citiesJson from '../cities_all.json';

type City = { id: number; name: string; state?: { code?: string; name?: string } };

type Props = {
    value?: string;
    onChange: (value: string) => void;
    onSelect?: (name: string, id?: number) => void;
    placeholder?: string;
    required?: boolean;
};

const normalize = (s: string) =>
    s
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

const CityAutocomplete: React.FC<Props> = ({ value = '', onChange, onSelect, placeholder, required }) => {
    const [cities, setCities] = useState<City[]>([]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const [filtered, setFiltered] = useState<City[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
        // Use static JSON bundled with the app to avoid dev/prod 404s.
        const data = (citiesJson as any)?.results || (citiesJson as any) || [];
        setCities(data as City[]);
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
        const results = cities
            .filter((c) => normalize(c.name || '').includes(q) || normalize(c.state?.code || '').includes(q))
            .slice(0, 12);
        setFiltered(results);
        setActiveIndex(-1);
    }, [query, cities]);

    const handleInput = (v: string) => {
        setQuery(v);
        onChange(v);
        setOpen(true);
    };

    const handleSelect = (c: City) => {
        const display = `${c.name}${c.state?.code ? ` - ${c.state.code}` : ''}`;
        setQuery(display);
        onChange(display);
        setOpen(false);
        onSelect?.(c.name, c.id);
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
                    aria-label="toggle cities"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500 dark:text-gray-300">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {open && filtered.length > 0 && (
                <ul ref={listRef} className="absolute z-50 w-full max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md mt-1 shadow-lg">
                    {filtered.map((c, idx) => (
                        <li
                            key={c.id}
                            onMouseDown={(ev) => {
                                ev.preventDefault();
                                handleSelect(c);
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${idx === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        >
                            <div className="text-sm text-gray-900 dark:text-gray-100">{c.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{c.state?.code || c.state?.name || ''}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CityAutocomplete;

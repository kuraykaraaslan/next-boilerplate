import { useState, KeyboardEvent, useRef, useEffect } from "react";
import GenericElement, { GenericElementProps } from "../GenericElement";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

type OptionObject = { value: string; label: string; [key: string]: any } | Record<string, any>;
type OptionItem = string | OptionObject;

export interface DynamicCommaSeperatedTextProps extends GenericElementProps {
    values: string[];
    setValues: (value: string[]) => void;
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    availableValues?: OptionItem[];
    valueKey?: string;
    labelKey?: string;
}

const DynamicCommaSeperatedText: React.FC<DynamicCommaSeperatedTextProps> = ({
    label,
    className = "",
    values,
    setValues,
    placeholder = "Yazın ve virgül veya Enter ile ekleyin...",
    size = 'md',
    disabled = false,
    availableValues,
    valueKey = 'value',
    labelKey = 'label',
}) => {
    const [inputValue, setInputValue] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const sizeClass =
        size === 'sm' ? 'input-sm' :
            size === 'lg' ? 'input-lg' :
                'input-md';

    const badgeSizeClass =
        size === 'sm' ? 'badge-sm' :
            size === 'lg' ? 'badge-lg' :
                'badge-md';

    // Option'dan value ve label çıkar
    const getOptionValue = (option: OptionItem): string => {
        if (typeof option === 'string') return option;
        return option[valueKey] || '';
    };

    const getOptionLabel = (option: OptionItem): string => {
        if (typeof option === 'string') return option;
        return option[labelKey] || option[valueKey] || '';
    };

    // Tüm available value'ları string olarak al
    const allAvailableValues = availableValues?.map(getOptionValue) || [];

    // Henüz seçilmemiş option'ları filtrele
    const remainingOptions = availableValues?.filter(
        option => !values.includes(getOptionValue(option))
    ) || [];

    // Arama sonuçlarını filtrele
    const filteredOptions = remainingOptions.filter(option => {
        const label = getOptionLabel(option).toLowerCase();
        const value = getOptionValue(option).toLowerCase();
        const search = inputValue.toLowerCase();
        return label.includes(search) || value.includes(search);
    });

    // Seçili value'nun label'ını bul
    const getLabelForValue = (val: string): string => {
        if (!availableValues) return val;
        const option = availableValues.find(opt => getOptionValue(opt) === val);
        return option ? getOptionLabel(option) : val;
    };

    const addValue = (value: string) => {
        const trimmed = value.trim();
        if (trimmed && !values.includes(trimmed)) {
            // availableValues varsa sadece onlardan eklenmeli
            if (!availableValues || allAvailableValues.includes(trimmed)) {
                setValues([...values, trimmed]);
            }
        }
        setInputValue("");
        setIsDropdownOpen(false);
        setHighlightedIndex(0);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (availableValues && isDropdownOpen && filteredOptions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                addValue(getOptionValue(filteredOptions[highlightedIndex]));
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsDropdownOpen(false);
                return;
            }
        }

        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            if (availableValues && filteredOptions.length > 0) {
                addValue(getOptionValue(filteredOptions[0]));
            } else if (!availableValues) {
                addValue(inputValue);
            }
        } else if (e.key === 'Backspace' && inputValue === "" && values.length > 0) {
            removeValue(values.length - 1);
        }
    };

    const handleInputChange = (value: string) => {
        if (availableValues) {
            setInputValue(value);
            setIsDropdownOpen(true);
            setHighlightedIndex(0);
        } else {
            if (value.includes(',')) {
                const parts = value.split(',');
                parts.forEach((part, index) => {
                    if (index < parts.length - 1) {
                        addValue(part);
                    } else {
                        setInputValue(part);
                    }
                });
            } else {
                setInputValue(value);
            }
        }
    };

    const removeValue = (index: number) => {
        setValues(values.filter((_, i) => i !== index));
    };

    const startEditing = (index: number) => {
        if (disabled || availableValues) return;
        setEditingIndex(index);
        setEditValue(values[index]);
    };

    const finishEditing = () => {
        if (editingIndex === null) return;

        const trimmed = editValue.trim();
        if (trimmed && trimmed !== values[editingIndex]) {
            const newValues = [...values];
            if (!values.includes(trimmed) || values[editingIndex] === trimmed) {
                newValues[editingIndex] = trimmed;
                setValues(newValues);
            }
        }
        setEditingIndex(null);
        setEditValue("");
    };

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            setEditingIndex(null);
            setEditValue("");
        }
    };

    // Highlighted item'ı görünür yap
    useEffect(() => {
        if (isDropdownOpen && dropdownRef.current) {
            const highlighted = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (highlighted) {
                highlighted.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isDropdownOpen]);

    return (
        <GenericElement label={label} className={className}>
            <div className={`input ${sizeClass} w-full h-auto min-h-12 flex flex-wrap gap-2 items-center py-2 relative`}>
                {values.map((value, index) => (
                    editingIndex === index ? (
                        <input
                            key={index}
                            type="text"
                            className="input input-xs input-bordered w-auto min-w-20"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={finishEditing}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                        />
                    ) : (
                        <span
                            key={index}
                            className={`badge ${badgeSizeClass} badge-primary gap-1 cursor-pointer hover:badge-secondary transition-colors`}
                            onDoubleClick={() => startEditing(index)}
                        >
                            {getLabelForValue(value)}
                            {!disabled && (
                                <button
                                    type="button"
                                    className="hover:text-error"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeValue(index);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                </button>
                            )}
                        </span>
                    )
                ))}

                {!disabled && (
                    <div className="relative flex-1 min-w-32">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent outline-none border-none"
                            placeholder={values.length === 0 ? placeholder : (availableValues ? "Ara veya seç..." : "")}
                            value={inputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => availableValues && setIsDropdownOpen(true)}
                            onBlur={() => {
                                // Dropdown tıklaması için küçük bir gecikme
                                setTimeout(() => {
                                    setIsDropdownOpen(false);
                                    if (!availableValues && inputValue) {
                                        addValue(inputValue);
                                    }
                                }, 150);
                            }}
                        />

                        {/* Dropdown */}
                        {availableValues && isDropdownOpen && filteredOptions.length > 0 && (
                            <ul
                                ref={dropdownRef}
                                className="absolute top-full left-0 mt-1 z-20 menu bg-base-200 rounded-box shadow-lg max-h-60 overflow-y-auto w-max min-w-40"
                            >
                                {filteredOptions.map((option, idx) => (
                                    <li key={getOptionValue(option)}>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                addValue(getOptionValue(option));
                                            }}
                                            className={`text-sm ${idx === highlightedIndex ? 'active' : ''}`}
                                        >
                                            {getOptionLabel(option)}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Sonuç yok mesajı */}
                        {availableValues && isDropdownOpen && inputValue && filteredOptions.length === 0 && remainingOptions.length > 0 && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-base-200 rounded-box shadow-lg p-3 text-sm text-base-content/60">
                                Sonuç bulunamadı
                            </div>
                        )}
                    </div>
                )}
            </div>
            {!availableValues && (
                <p className="text-xs text-base-content/60 mt-1">
                    Düzenlemek için çift tıklayın
                </p>
            )}
        </GenericElement>
    );
};

export default DynamicCommaSeperatedText;

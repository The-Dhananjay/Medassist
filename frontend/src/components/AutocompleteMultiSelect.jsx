import { useState, useRef, useEffect, useMemo, useId } from "react";
import { X, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AutocompleteMultiSelect({
  label,
  placeholder = "Search or type...",
  predefinedItems = [],
  selectedItems = [],
  onChange,
  testId,
  allowCustom = true,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = useId();

  // Selected items array safety
  const items = useMemo(
    () => (Array.isArray(selectedItems) ? selectedItems : []),
    [selectedItems]
  );

  // Filter matching suggestions
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return predefinedItems
      .filter((item) => {
        const isAlreadySelected = items.some(
          (s) => s.toLowerCase() === item.toLowerCase()
        );
        if (isAlreadySelected) return false;
        if (!q) return true;
        return item.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [query, predefinedItems, items]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addItem = (item) => {
    const val = item.trim();
    if (!val) return;
    const exists = items.some((i) => i.toLowerCase() === val.toLowerCase());
    if (!exists) {
      onChange([...items, val]);
    }
    setQuery("");
    setActiveIndex(-1);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const removeItem = (item) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        addItem(suggestions[activeIndex]);
      } else if (query.trim() && allowCustom) {
        addItem(query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && <Label>{label}</Label>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            data-testid={testId}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="mt-1"
          />

          <AnimatePresence>
            {isOpen && suggestions.length > 0 && (
              <motion.ul
                id={listboxId}
                role="listbox"
                className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md divide-y divide-border/40"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {suggestions.map((s, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={s}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => addItem(s)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`cursor-pointer rounded-sm px-3 py-2 text-sm transition-colors duration-150 ${
                        isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted"
                      }`}
                      data-testid={`${testId}-suggestion-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {s}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {allowCustom && query.trim() && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => addItem(query)}
            className="min-h-[40px] shrink-0"
            data-testid={`${testId}-add-button`}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1" data-testid={`${testId}-chips-list`}>
          <AnimatePresence>
            {items.map((item) => (
              <motion.span
                key={item}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                data-testid={`${testId}-chip-${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium border border-border/50"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="rounded-full p-0.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${item}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

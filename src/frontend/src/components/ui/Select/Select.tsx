"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Select.module.css";

type SelectOption = { value: string; label: string; disabled?: boolean };
type SelectProps = {
  id?: string;
  name?: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
};

export function Select({
  id,
  name,
  label,
  value,
  options,
  onChange,
  disabled,
  required,
}: SelectProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listId = `${controlId}-options`;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);

  function close() {
    popup.current?.hidePopover();
    setOpen(false);
  }

  function show(
    index = options.findIndex(
      (option) => option.value === value && !option.disabled,
    ),
  ) {
    if (disabled || !button.current || !popup.current) return;
    const rect = button.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const offsetTop = viewport?.offsetTop ?? 0;
    const below = height + offsetTop - rect.bottom - 12;
    const above = rect.top - offsetTop - 12;
    const upwards = below < 220 && above > below;
    const available = Math.max(40, Math.min(280, upwards ? above : below));
    const width = Math.min(rect.width, window.innerWidth - 24);
    Object.assign(popup.current.style, {
      width: `${width}px`,
      maxHeight: `${available}px`,
      left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
      top: upwards ? "auto" : `${rect.bottom + 6}px`,
      bottom: upwards ? `${window.innerHeight - rect.top + 6}px` : "auto",
    });
    setActive(
      index >= 0
        ? index
        : Math.max(
            0,
            options.findIndex((option) => !option.disabled),
          ),
    );
    popup.current.showPopover();
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
    button.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (
        event.type === "resize" ||
        !root.current?.contains(event.target as Node)
      ) {
        popup.current?.hidePopover();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const position = enabled.indexOf(active);
      const next =
        event.key === "Home"
          ? enabled[0]
          : event.key === "End"
            ? enabled.at(-1)
            : enabled[
                Math.max(
                  0,
                  Math.min(
                    enabled.length - 1,
                    position + (event.key === "ArrowDown" ? 1 : -1),
                  ),
                )
              ];
      if (!open) show(event.key === "End" ? enabled.at(-1) : undefined);
      else if (next !== undefined) setActive(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const now = Date.now();
      typeahead.current.text =
        (now - typeahead.current.time > 700 ? "" : typeahead.current.text) +
        event.key.toLocaleLowerCase();
      typeahead.current.time = now;
      const match = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLocaleLowerCase().startsWith(typeahead.current.text),
      );
      if (match >= 0) {
        if (open) setActive(match);
        else show(match);
      }
    }
  }

  return (
    <div ref={root} className={styles.select}>
      <button
        ref={button}
        id={controlId}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-required={required}
        aria-activedescendant={
          open && options[active] ? `${listId}-${active}` : undefined
        }
        disabled={disabled}
        className={styles.trigger}
        onKeyDown={keyboard}
        onClick={() => (open ? close() : show())}
      >
        <span>{selected?.label || "Seleccionar…"}</span>
        <Icon name="chevron" size={14} />
      </button>
      {/* Conserva validación HTML y FormData sin mostrar el menú nativo del sistema. */}
      <select
        className={styles.native}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onChange(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          button.current?.focus();
          show();
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <div
        ref={popup}
        id={listId}
        popover="manual"
        role="listbox"
        aria-label={label}
        className={styles.popup}
        onMouseDown={(event) => event.preventDefault()}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={option.value === value}
            aria-disabled={option.disabled || undefined}
            data-index={index}
            data-active={index === active}
            className={styles.option}
            onPointerMove={() => {
              if (!option.disabled) setActive(index);
            }}
            onClick={(event) => {
              // Evita que el <label> exterior vuelva a activar el disparador.
              event.preventDefault();
              event.stopPropagation();
              choose(index);
            }}
          >
            <span>{option.label}</span>
            {option.value === value && (
              <span className={styles.check} aria-hidden="true">
                ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

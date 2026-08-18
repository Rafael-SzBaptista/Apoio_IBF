import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { ptBR } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { todayIso } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDisplayDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR");
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const triggerClass =
  "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-muted px-3 text-left text-sm shadow-sm outline-none transition-colors hover:bg-muted/80 focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function DatePicker({
  value,
  onChange,
  disabled,
  required,
  className,
  placeholder = "Selecionar data",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseIsoDate(value) : undefined;
  const [month, setMonth] = useState<Date | undefined>(selected);

  return (
    <>
      {required ? (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="sr-only"
          aria-hidden
        />
      ) : null}
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setMonth(selected ?? parseIsoDate(todayIso()));
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            data-slot="picker-trigger"
            disabled={disabled}
            className={cn(triggerClass, className)}
            aria-required={required}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
              {value ? formatDisplayDate(value) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-xl p-3"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            className="bg-transparent p-0"
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
          />
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-medium text-primary hover:text-primary"
            onClick={() => {
              onChange(todayIso());
              setOpen(false);
            }}
          >
            Hoje
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}

export function TimePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Selecionar horário",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const time = value.slice(0, 5);
  const [hour = "", minute = ""] = time.split(":");
  const minuteOptions = useMemo(() => {
    if (minute && !MINUTES.includes(minute)) return [...MINUTES, minute].sort();
    return MINUTES;
  }, [minute]);

  const pick = (nextHour: string, nextMinute: string) => {
    if (!nextHour || !nextMinute) return;
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="picker-trigger"
          disabled={disabled}
          className={cn(triggerClass, className)}
        >
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate", !time && "text-muted-foreground")}>
            {time || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-xl p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex gap-2">
          <TimeColumn
            label="Hora"
            options={HOURS}
            selected={hour}
            onSelect={(next) => pick(next, minute || "00")}
          />
          <TimeColumn
            label="Min"
            options={minuteOptions}
            selected={minute}
            onSelect={(next) => pick(hour || "19", next)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-medium text-primary hover:text-primary"
            onClick={() => {
              onChange(nowTime());
              setOpen(false);
            }}
          >
            Agora
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = selectedRef.current;
    const container = el?.parentElement;
    if (!el || !container) return;
    container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
  }, [selected]);

  return (
    <div className="min-w-14">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="h-44 space-y-0.5 overflow-y-auto pr-0.5">
        {options.map((option) => (
          <button
            key={option}
            ref={option === selected ? selectedRef : undefined}
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-center rounded-md text-sm",
              option === selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

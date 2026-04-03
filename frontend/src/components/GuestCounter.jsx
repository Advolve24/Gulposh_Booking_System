import { Minus, Plus } from "lucide-react";

export default function GuestCounter({
  label,
  description,
  value,
  min = 0,
  max,
  onChange,
  onMaxAttempt,
}) {
  const dec = () => value > min && onChange(value - 1);
  const inc = () => {
    if (value < max) {
      onChange(value + 1);
      return;
    }
    onMaxAttempt?.();
  };
  const isIncrementDisabled = value >= max && !onMaxAttempt;

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={dec}
          disabled={value <= min}
          className="h-8 w-8 rounded-full border flex items-center justify-center disabled:opacity-40"
        >
          <Minus size={14} />
        </button>

        <span className="w-6 text-center">{value}</span>

        <button
          onClick={inc}
          disabled={isIncrementDisabled}
          className="h-8 w-8 rounded-full border flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

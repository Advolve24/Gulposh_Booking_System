import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function MultiSelectDropdown({ label, options, selected, onSelect }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selected.length > 0 ? `${selected.length} selected` : `Select ${label}`}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3 space-y-2">
          {options.map((opt) => (
            <div
              key={opt}
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => onSelect(opt)}
            >
              <Checkbox checked={selected.includes(opt)} />
              <span className="text-sm">{opt}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default MultiSelectDropdown;

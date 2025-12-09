import { useMemo } from "react";
import { amenityCategories } from "../data/aminities";

export default function AmenitiesDropdown({ amenities }) {
  
  // Flatten amenities from ALL categories
  const allItems = useMemo(() => {
    return amenityCategories.flatMap((cat) => cat.items);
  }, []);

  // Filter only selected amenities
  const selected = useMemo(() => {
    return allItems.filter((item) => amenities.includes(item.id));
  }, [amenities, allItems]);

  if (!selected.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-2">Amenities</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {selected.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border rounded-lg p-3 bg-white shadow-sm"
          >
            <item.icon className="w-5 h-5 text-gray-700" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

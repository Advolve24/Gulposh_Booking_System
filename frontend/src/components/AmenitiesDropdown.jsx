import { useState, useMemo } from "react";
import { amenityCategories } from "../data/aminities";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AmenitiesDropdown({ amenities }) {
    const [openLeft, setOpenLeft] = useState(null);
    const [openRight, setOpenRight] = useState(null);


    const filtered = useMemo(() => {
        return amenityCategories
            .map((cat) => ({
                ...cat,
                selected: cat.items.filter((i) => amenities.includes(i.id)),
            }))
            .filter((cat) => cat.selected.length > 0); 
    }, [amenities]);


    const midpoint = Math.ceil(filtered.length / 2);
    const leftCol = filtered.slice(0, midpoint);
    const rightCol = filtered.slice(midpoint);

    const renderColumn = (column, openState, setOpenState) => (
        <div className="space-y-4">
            {column.map((cat) => {
                const isOpen = openState === cat.id;

                return (
                    <div key={cat.id} className="border rounded-lg bg-white">
                        {/* HEADER */}
                        <button
                            type="button"
                            onClick={() => setOpenState(isOpen ? null : cat.id)}
                            className="w-full flex justify-between items-center p-3 font-medium"
                        >
                            <span className="flex items-center gap-2">
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </span>

                            {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {/* CONTENT */}
                        {isOpen && (
                            <div className="p-3 border-t space-y-2">
                                {cat.selected.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 text-sm border rounded px-2 py-1"
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-2">Amenities</h3>

            <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT COLUMN */}
                <div className="flex-1 space-y-4">
                    {renderColumn(leftCol, openLeft, setOpenLeft)}
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex-1 space-y-4">
                    {renderColumn(rightCol, openRight, setOpenRight)}
                </div>
            </div>
        </div>
    );
}

import { IndianRupee, CalendarCheck, Percent, BedDouble } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default"
}) {

  const bg =
    variant === "revenue"
      ? "bg-[#6B2737] text-white"
      : variant === "green"
      ? "bg-[#2F8F6B] text-white"
      : "bg-white";

  const iconMap = {
    revenue: <IndianRupee size={18} />,
    bookings: <CalendarCheck size={18} />,
    occupancy: <Percent size={18} />,
    avg: <BedDouble size={18} />
  };

  return (
    <div
      className={`relative rounded-xl border p-6 flex justify-between items-start ${bg}`}
    >
      <div>
        <p
          className={`text-sm ${
            variant !== "default" ? "text-white/80" : "text-gray-500"
          }`}
        >
          {title}
        </p>

        <h3 className="text-2xl font-semibold mt-1">{value}</h3>

        {subtitle && (
          <p
            className={`text-xs mt-1 ${
              variant !== "default" ? "text-white/70" : "text-gray-400"
            }`}
          >
            {subtitle}
          </p>
        )}

        {trend && (
          <p
            className={`text-xs mt-1 ${
              trend.includes("+") ? "text-green-500" : "text-red-500"
            }`}
          >
            {trend}
          </p>
        )}
      </div>

      <div
        className={`w-10 h-10 flex items-center justify-center rounded-lg ${
          variant === "revenue"
            ? "bg-white/20 text-white"
            : variant === "green"
            ? "bg-white/20 text-white"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {iconMap[icon]}
      </div>
    </div>
  );
}
export default function StatCard({
  title,
  value,
  subtitle,
  color = "white"
}) {
  return (
    <div className={`p-6 rounded-xl border ${color}`}>
      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="text-2xl font-bold mt-1">
        {value}
      </h2>

      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
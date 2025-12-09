export default function TableStyle13({ data, currency = "₹" }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-semibold text-gray-700 border-b">
              Description
            </th>
            <th className="text-left px-4 py-2 text-sm font-semibold text-gray-700 border-b">
              Rate
            </th>
            <th className="text-right px-4 py-2 text-sm font-semibold text-gray-700 border-b">
              Total
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((item, index) => {
            const price = Number(item.price || 0);
            const guests = Number(item.guests || 1);
            const nights = Number(item.nights || 1);

            const isRoom = item.item.toLowerCase().includes("room");

            const total = isRoom
              ? price * nights
              : price * guests * nights;

            return (
              <tr key={index}>
                <td className="px-4 py-3 text-sm text-gray-800">{item.item}</td>

                <td className="px-4 py-3 text-sm text-gray-800">
                  {currency}{price} ×{" "}
                  {isRoom
                    ? `${nights} night(s)`           
                    : `${guests} guest(s) × ${nights} night(s)`}   
                </td>

                <td className="px-4 py-3 text-sm text-gray-800 text-right">
                  {currency}{total.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TableStyle13({ data, serviceCharge, currency = "₹" }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
              Description
            </th>
            <th className="text-left px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
              Rate
            </th>
            <th className="text-right px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-3 text-sm text-gray-800">{item.item}</td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {currency}{`${item.price} x ${item.qty} ${item.desc}`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800 text-right">
                {currency}{(item.price * item.qty).toFixed(2)}
              </td>
            </tr>
          ))}
          <tr>
            <td className="px-4 py-3 text-sm text-gray-800">Service Fee (Included VAT)</td>
            <td className="px-4 py-3 text-sm text-gray-800">{currency}{serviceCharge}</td>
            <td className="px-4 py-3 text-sm text-gray-800 text-right">
              {currency}{serviceCharge.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

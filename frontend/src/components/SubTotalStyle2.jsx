
export default function SubTotalStyle2({subTotal, discountAmount, discountPersent, taxPersent, taxAmount, grandTotal, gtBg, gtColor}) {
  return (
    <table className="tm_mb15">
      <tbody>
        <tr>
          <td className="tm_width_3 tm_primary_color tm_border_none tm_bold">
            SubTotal
          </td>
          <td className="tm_width_3 tm_primary_color tm_text_right tm_border_none tm_bold">₹{subTotal.toFixed(2)}</td>
        </tr>
        <tr>
          {discountPersent === 0 ? '' : <td className="tm_width_3 tm_danger_color tm_border_none tm_pt0"> Discount {`${discountPersent}%`}</td>}
          {discountAmount && <td className="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">- ₹{discountAmount.toFixed(2)}</td>}
        </tr>
        <tr>
          <td className="tm_width_3 tm_primary_color tm_border_none tm_pt0">
            Tax {`${taxPersent}%`}
          </td>
          <td className="tm_width_3 tm_primary_color tm_text_right tm_border_none tm_pt0">+ ₹{taxAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td className={`tm_width_3 tm_border_top_0 tm_bold tm_f16 ${gtBg} ${gtColor}  tm_radius_6_0_0_6`}>
            Grand Total
          </td>
          <td className={`tm_width_3 tm_border_top_0 tm_bold tm_f16 ${gtBg} ${gtColor} tm_text_right tm_radius_0_6_6_0`}>₹{grandTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  )
}

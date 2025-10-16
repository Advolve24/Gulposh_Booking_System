
export default function Signature({imgUrl, name, designation}) {
  return (
    <div className="tm_sign tm_text_center">
      <img src={imgUrl} alt="Sign" />
      <p className="tm_m0 tm_ternary_color">{name}</p>
      <p className="tm_m0 tm_f16 tm_primary_color">{designation}</p>
    </div>
  )
}

import parser from 'html-react-parser'

export default function TermsStyle5({title, subTitle}) {
  return (
    <div className="tm_text_center">
      <p className="tm_mb5">
        <b className="tm_primary_color">{title}:</b>
      </p>
      <p className="tm_m0">{parser(subTitle)}</p>
    </div>
  )
}

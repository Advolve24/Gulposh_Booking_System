import parser from "html-react-parser";

export default function InvoiceToPayTo({title, subTitle, varient}) {
  return (
    <div className={`${varient ? varient : ''}`} >
      <p className="tm_mb2">
        <b className="tm_primary_color">{`${title ? parser(title) + ':' : ''}`}</b>
      </p>
      <p className="text-[14px]">{parser(subTitle)}</p>
    </div>
  )
}

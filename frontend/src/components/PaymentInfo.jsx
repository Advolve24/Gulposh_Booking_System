import parser from "html-react-parser";

export default function PaymentInfo({ varient, title, cardType, cardNumber, amount, author }) {
  const formattedAmount =
    typeof amount === "number"
      ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      : amount;

  return (
    <div className={varient || ""}>
      <p className="tm_mb2">
        <b className="tm_primary_color">{parser(title)}:</b>
      </p>
      {author && <p className="tm_mb0">{author}</p>}
      <p className="tm_mb0">
        {cardType} — {parser(cardNumber)}
      </p>
      <p className="tm_mb0">Amount: {formattedAmount}</p>
    </div>
  );
}

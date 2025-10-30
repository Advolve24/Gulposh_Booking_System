export default function ThankYou() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
      <h1 className="text-3xl font-semibold">Thank you!</h1>
      <p>Your enquiry has been submitted successfully.</p>
      <p className="text-muted-foreground">
        For quick assistance, contact us at:
      </p>
      <div className="text-lg">
        <p><b>Email:</b> <a href="mailto:web@advolve.in" className="text-primary">web@advolve.in</a></p>
        <p><b>Phone:</b> <a href="tel:9322828331" className="text-primary">9322828331</a></p>
      </div>
    </div>
  );
}

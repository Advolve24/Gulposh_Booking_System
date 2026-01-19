export default function RefundCancellation() {
  return (
    <main className="bg-background">

      {/* ================= HERO ================= */}
      <section className="bg-[#660810] text-white">
        <div className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
          <h1 className="font-heading text-3xl sm:text-4xl mb-4">
            Refund & Cancellation Policy
          </h1>

          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Applies to bookings made on booking.villagulposh.com
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground">

          {/* PROPERTY INFO */}
          <div className="space-y-2">
            <p><strong>Property:</strong> Villa Gulposh – Vidyasagar Properties Pvt Ltd.</p>
            <p><strong>Contact:</strong> +91 98200 74617 | stay@villagulposh.com</p>
            <p><strong>Check-in:</strong> 12:00 PM | <strong>Check-out:</strong> 10:00 AM</p>
          </div>

          <Divider />

          <PolicyBlock
            title="1. How to Cancel"
            points={[
              "Cancellation is available directly via the portal: booking.villagulposh.com",
              "After cancellation, the booking status will update as per the portal flow and you will receive confirmation (screen/email/SMS as applicable)"
            ]}
          />

          <PolicyBlock
            title="2. Cancellation & Refund Rules"
            points={[
              "Refund eligibility is calculated based on days before the check-in date (12:00 PM):",
              "Cancel 10 days or more before check-in: 100% refund",
              "Cancel between 5 to 9 days before check-in: 50% refund",
              "Cancel less than 5 days before check-in: 0% refund (no refund)"
            ]}
          />

          <PolicyBlock
            title="3. Refund Method & Processing Time (Manual Refund)"
            points={[
              "Refunds are processed within 8 to 10 working days after cancellation approval",
              "Refunds are made manually by the owner to your bank account (not instant auto-reversal)",
              "Villa Gulposh management will call you to collect required bank details (account holder name, account number, IFSC, bank name)"
            ]}
          />

          <PolicyBlock
            title="4. Important Notes"
            points={[
              "Please ensure bank details shared are correct; Villa Gulposh is not responsible for delays caused by incorrect or incomplete information",
              "Any bank-side delays after transfer initiation are beyond Villa Gulposh’s control, but the team will assist in tracking"
            ]}
          />

          <PolicyBlock
            title="5. No-Show / Early Checkout"
            points={[
              "No-show (not arriving on check-in date): treated as cancellation less than 5 days → no refund",
              "Early checkout: no refund for unused nights unless approved in writing by management"
            ]}
          />

          <PolicyBlock
            title="6. Force Majeure"
            points={[
              "In case of events beyond control (natural calamities, government restrictions, etc.), Villa Gulposh may offer rescheduling or partial refunds on a case-by-case basis",
              "For support: +91 98200 74617 | stay@villagulposh.com"
            ]}
          />

        </div>
      </section>
    </main>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function PolicyBlock({ title, points }) {
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg sm:text-xl">
        {title}
      </h2>

      <ul className="list-disc pl-5 space-y-2">
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

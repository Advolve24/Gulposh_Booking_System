export default function PrivacyPolicy() {
  return (
    <main className="bg-background">

      {/* ================= HERO ================= */}
      <section className="bg-[#660810] text-white">
        <div className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
          <h1 className="font-heading text-3xl sm:text-4xl mb-4">
            Privacy Policy
          </h1>

          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Applies to villagulposh.com and booking.villagulposh.com
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground">

          {/* INTRO */}
          <PolicyIntro />

          <Divider />

          <PolicyBlock
            title="1. What Information We Collect"
            points={[
              "Personal details: name, email, phone number, address (if provided), booking-related details",
              "Booking details: check-in/out dates, guest count, food guest count, special requests",
              "Account/auth details: login/OTP verification details (via Firebase, as applicable)",
              "Payment details: transaction reference, payment status, order IDs (payments handled by Razorpay; we do not store your full card/bank details)",
              "Technical data: IP address, device/browser info, logs, and cookies (for security and improving the portal)"
            ]}
          />

          <PolicyBlock
            title="2. How We Use Your Information"
            points={[
              "Create and manage bookings and your portal account",
              "Confirm reservations, communicate updates, and provide customer support",
              "Arrange operational services (check-in, housekeeping, food planning)",
              "Improve website/portal performance and security",
              "Comply with legal obligations and prevent fraud"
            ]}
          />

          <PolicyBlock
            title="3. Sharing of Information"
            points={[
              "Payment processor: Razorpay (for payment processing)",
              "Technology services: hosting, database, authentication (Firebase), and security tools",
              "Operational staff/manager: to coordinate your stay and finalize food menu after booking",
              "Legal/authorities: if required by law or for safety/security reasons",
              "We do not sell your personal information"
            ]}
          />

          <PolicyBlock
            title="4. Data Security"
            points={[
              "We take reasonable security measures to protect data",
              "No online system is 100% secure; please keep your login credentials confidential"
            ]}
          />

          <PolicyBlock
            title="5. Data Retention"
            points={[
              "We retain data only as long as required for bookings, support, legal compliance, and legitimate business purposes"
            ]}
          />

          <PolicyBlock
            title="6. Your Choices & Rights"
            points={[
              "Request correction of inaccurate information",
              "Request deletion of account data (subject to legal/booking record requirements)",
              "To request changes, email: stay@villagulposh.com"
            ]}
          />

          <PolicyBlock
            title="7. Cookies"
            points={[
              "Cookies may be used for session management, security, and improving user experience",
              "You can manage cookies in your browser settings"
            ]}
          />

          <PolicyBlock
            title="8. Contact"
            points={[
              "For privacy queries: stay@villagulposh.com",
              "Contact number: +91 98200 74617"
            ]}
          />

        </div>
      </section>
    </main>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function PolicyIntro() {
  return (
    <div className="space-y-2">
      <p><strong>Property:</strong> Villa Gulposh – Vidyasagar Properties Pvt Ltd.</p>
      <p><strong>Websites:</strong> villagulposh.com & booking.villagulposh.com</p>
    </div>
  );
}

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

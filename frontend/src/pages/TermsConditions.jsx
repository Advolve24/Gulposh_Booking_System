import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsConditions() {
  return (
    <>

      {/* ================= PAGE WRAPPER ================= */}
      <main className="bg-background">
        {/* ================= HERO / TITLE ================= */}
        <section className="bg-[#660810] text-white">
          <div className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
            <h1 className="font-heading text-2xl sm:text-4xl mb-4">
              Terms & Conditions
            </h1>

            <p className="text-white/90 text-sm sm:text-base leading-relaxed">
              Effective for booking.villagulposh.com (booking & user-login portal)
              and villagulposh.com (main website)
            </p>
          </div>
        </section>

        {/* ================= CONTENT ================= */}
        <section className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground">

            {/* PROPERTY INFO */}
            <div className="space-y-2">
              <p><strong>Property:</strong> Villa Gulposh – Vidyasagar Properties Pvt Ltd.</p>
              <p><strong>Address:</strong> House no 32 A, Dnyandeep Society, Kirawali, Karjat – 410201</p>
              <p><strong>Contact:</strong> +91 98200 74617 | stay@villagulposh.com</p>
            </div>

            <Divider />

            {/* 1 */}
            <PolicyBlock
              title="1. Acceptance of Terms"
              content={[
                "By accessing, browsing, registering, or making a booking on booking.villagulposh.com, you agree to these Terms & Conditions, along with our Privacy Policy and Refund & Cancellation Policy."
              ]}
            />

            {/* 2 */}
            <PolicyBlock
              title="2. Booking Process & Confirmation"
              content={[
                "A booking is considered confirmed only after successful payment (full/partial as shown at checkout) and generation of a booking confirmation on the portal.",
                "You must provide accurate details (guest count, contact info, dates). Incorrect details may lead to booking issues, price changes, or cancellation as per policy."
              ]}
            />

            {/* 3 */}
            <PolicyBlock
              title="3. Check-in / Check-out"
              content={[
                "Check-in: 12:00 PM",
                "Check-out: 10:00 AM",
                "Early check-in/late check-out is subject to availability and may be chargeable."
              ]}
            />

            {/* 4 */}
            <PolicyBlock
              title="4. Guest Policy (Registered Guests Only)"
              content={[
                "Only registered/declared guests are allowed inside the property.",
                "Any additional guests/visitors may be denied entry or charged as per property decision.",
                "Guests must carry valid government ID proof if requested at check-in."
              ]}
            />

            {/* 5 */}
            <PolicyBlock
              title="5. Food & Meal Service"
              content={[
                "Villa Gulposh serves Veg and Non-Veg food.",
                "During booking, you may be asked for number of guests opting for food.",
                "No menu is finalized on the website/portal.",
                "After booking is confirmed, the property manager will call you to finalize the menu and schedule.",
                "Food availability and timing may be subject to operational feasibility and local sourcing."
              ]}
            />

            {/* 6 */}
            <PolicyBlock
              title="6. House Rules & Conduct"
              content={[
                "Registered guests only.",
                "Treat the property respectfully and keep it clean.",
                "Smoking and alcohol consumption are strictly prohibited inside the rooms and pool area.",
                "Any illegal activity, property misuse, or nuisance may result in immediate eviction without refund."
              ]}
            />

            {/* 7 */}
            <PolicyBlock
              title="7. Pool Usage"
              content={[
                "Use of the pool is subject to the Pool Safety Guidelines & Declaration.",
                "Villa Gulposh may restrict pool access at any time for safety, maintenance, or weather conditions."
              ]}
            />

            {/* 8 */}
            <PolicyBlock
              title="8. Damage, Loss & Extra Cleaning"
              content={[
                "Guests are responsible for any damage to property, furniture, fixtures, linens, or amenities caused during the stay.",
                "Extra cleaning required due to misuse may be chargeable.",
                "The property is not responsible for loss of personal belongings. Please secure valuables."
              ]}
            />

            {/* 9 */}
            <PolicyBlock
              title="9. Pricing, Taxes & Inclusions"
              content={[
                "Prices shown on the portal are based on selected dates, guest count, and selected add-ons (if any).",
                "Any applicable taxes/fees will be shown at checkout or on invoice/confirmation, as applicable."
              ]}
            />

            {/* 10 */}
            <PolicyBlock
              title="10. Technology & Payment"
              content={[
                "Booking portal is built using MERN and Firebase for web app functionality.",
                "Payments are processed via Razorpay. You agree to Razorpay’s applicable terms during payment."
              ]}
            />

            {/* 11 */}
            <PolicyBlock
              title="11. Limitation of Liability"
              content={[
                "Staying at the property and using facilities (including pool) is at your own risk.",
                "Villa Gulposh is not liable for injuries, accidents, loss, or damages arising from misuse, negligence, or violation of guidelines."
              ]}
            />

            {/* 12 */}
            <PolicyBlock
              title="12. Changes to Booking / Portal"
              content={[
                "Villa Gulposh may update content, pricing, features, or policies at any time.",
                "Updated policies will be posted on the website/portal."
              ]}
            />

            {/* 13 */}
            <PolicyBlock
              title="13. Governing Law & Jurisdiction"
              content={[
                "These terms are governed by the laws of India.",
                "Any disputes shall be subject to jurisdiction of courts applicable to Karjat / Maharashtra."
              ]}
            />

          </div>
        </section>
      </main>
    </>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function PolicyBlock({ title, content }) {
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg sm:text-xl">
        {title}
      </h2>

      <ul className="space-y-2 pl-5 list-disc">
        {content.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

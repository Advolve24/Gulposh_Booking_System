import { forwardRef } from "react";
import { format } from "date-fns";

const AdminInvoiceTemplate = forwardRef(({ booking, adminMeta }, ref) => {
    if (!booking) return null;

    const safe = (v1, v2, v3 = "—") => v1 || v2 || v3;

    return (
        <div
            ref={ref}
            style={{
                width: "800px",
                background: "#fff",
                borderRadius: "16px",
                padding: "40px 50px",
                fontFamily: "Arial, sans-serif",
                color: "#1F2937",
                margin: "0 auto",
            }}
        >

            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <img src="/pdfLogo.png" alt="Logo" style={{ height: "46px", width: "46px" }} />
                    <div>
                        <div style={{ fontSize: "22px", fontWeight: "bold" }}>Gulposh</div>
                        <div style={{ fontSize: "12px", marginTop: "-4px" }}>IN REPOSE</div>
                    </div>
                </div>

                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", marginBottom: "4px", color: "#6B7280" }}>BOOKING ID</div>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                        {booking._id.toString().slice(-6).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* SECTION: Guest Details */}
            <SectionTitle title="Guest Details" />

            <Row label="Full Name:" value={safe(adminMeta?.fullName, booking?.contactName)} />
            <Row label="Phone Number:" value={safe(adminMeta?.phone, booking?.contactPhone)} />
            <Row label="Government ID Type:" value={safe(adminMeta?.govIdType, booking?.adminMeta?.govIdType)} />
            <Row label="Government ID Number:" value={safe(adminMeta?.govIdNumber, booking?.adminMeta?.govIdNumber)} />

            {/* SECTION: Stay Information */}
            <SectionTitle title="Stay Information" />

            <Row label="Check-In Date:" value={format(new Date(booking.startDate), "dd MMM yyyy")} />
            <Row label="Check-Out Date:" value={format(new Date(booking.endDate), "dd MMM yyyy")} />
            <Row label="Number Of Guests:" value={booking.guests} />
            <Row label="Room Assigned:" value={booking.room?.name || "—"} />

            {/* SECTION: Payment Information */}
            <SectionTitle title="Payment Information" />

            <Row label="Amount Paid:" value={`₹${safe(adminMeta?.amountPaid, booking.amount, 0)}`} />
            <Row
                label="Payment Mode:"
                value={safe(adminMeta?.paymentMode, booking.paymentProvider, "Cash")}
            />
            <Row label="Transaction ID:" value={booking.paymentId || booking.orderId || "N/A"} />

            {/* SECTION: Guest Consent */}
            <SectionTitle title="Guest Consent" />

            <div
                style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    background: "#F9FAFB",
                    marginBottom: "24px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                }}
            >
                <div
                    style={{
                        width: "18px",
                        height: "18px",
                        border: "2px solid #4B5563",
                        borderRadius: "4px",
                        marginTop: "3px",
                    }}
                ></div>
                <div style={{ fontSize: "14px", lineHeight: "20px", color: "#1F2937" }}>
                    I confirm that the above details are true and correct and I have
                    read and agreed to the terms and conditions.
                </div>
            </div>

            {/* Signature Box */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Guest Signature:</div>

                <div
                    style={{
                        border: "1px dashed #9CA3AF",
                        borderRadius: "8px",
                        padding: "32px 20px",
                        textAlign: "center",
                        color: "#9CA3AF",
                        fontSize: "12px",
                    }}
                >
                    (Please sign after verifying the details)
                </div>
            </div>

            {/* FOOTER */}
            <div
                style={{
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#6B7280",
                    borderTop: "1px solid #E5E7EB",
                    paddingTop: "18px",
                }}
            >
                <div style={{ fontWeight: "bold", marginBottom: "6px", color: "#1F2937" }}>
                    Terms And Conditions:
                </div>
                Your use of the Website shall be deemed to constitute your understanding and
                approval of, and agreement to be bound by, the Privacy Policy and you consent
                to the collection.
            </div>
        </div>
    );
});

export default AdminInvoiceTemplate;

/* -------- SUB COMPONENTS -------- */

function SectionTitle({ title }) {
    return (
        <div
            style={{
                fontWeight: "bold",
                marginTop: "26px",
                marginBottom: "12px",
                paddingBottom: "6px",
                borderBottom: "1px solid #E5E7EB",
                fontSize: "15px",
            }}
        >
            {title}
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                marginBottom: "10px",
                lineHeight: "20px",
            }}
        >
            <div style={{ color: "#374151", width: "40%" }}>{label}</div>
            <div style={{ fontWeight: "500", width: "60%", textAlign: "right" }}>{value}</div>
        </div>
    );
}

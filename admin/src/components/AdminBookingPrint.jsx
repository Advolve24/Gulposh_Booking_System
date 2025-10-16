import { forwardRef } from "react";
import { format } from "date-fns";

const AdminInvoiceTemplate = forwardRef(({ booking, adminMeta }, ref) => {
    if (!booking) return null;

    const serviceCharge = 10;
    const roomCharges = booking.pricePerNight * booking.nights;
    const breakfast = 30 * booking.nights;
    const subTotal = roomCharges + breakfast + serviceCharge;
    const discountPercent = 10;
    const discountAmount = (subTotal * discountPercent) / 100;
    const taxPercent = 10;
    const taxAmount = ((subTotal - discountAmount) * taxPercent) / 100;
    const grandTotal = subTotal - discountAmount + taxAmount;

    return (
        <div
            ref={ref}
            className="w-[800px] bg-white rounded-xl shadow-lg p-10 mx-auto font-sans text-gray-700"
        >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-6">
                <div>
                    <img src="/pdfLogo.png" alt="Logo" className="h-14" />
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 mt-1">
                        Booking ID -{booking._id.toString().slice(-6).toUpperCase()}
                    </p>
                </div>
            </div>

            {/* Guest Info */}
            <div className="grid grid-cols-2 gap-6 mt-2 border-b pb-6">
                <div className="mt-0">
                    <b className="block mb-2 text-gray-900">Guest Details:</b>

                    <ul className="list-disc list-inside text-gray-700 text-sm leading-relaxed space-y-1">
                        <li>
                            <span className="font-medium text-gray-800">Full Name:</span>{" "}
                            {adminMeta?.fullName || booking.contactName || "-"}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Phone Number:</span>{" "}
                            {adminMeta?.phone || booking.contactPhone || "-"}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Government ID Type:</span>{" "}
                            {adminMeta?.govIdType || "—"}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Government ID Number:</span>{" "}
                            {adminMeta?.govIdNumber || "—"}
                        </li>
                    </ul>
                </div>


            </div>

            {/* Stay Info */}
            <div className="grid grid-cols-2 gap-6 mt-2 border-b pb-6">
                <div className="mt-0">
                    <b className="block mb-2 text-gray-900">Stay Information:</b>

                    <ul className="list-disc list-inside text-gray-700 text-sm leading-relaxed space-y-1">
                        <li>
                            <span className="font-medium text-gray-800">Check-In Date:</span>{" "}
                            {format(new Date(booking.startDate), "dd MMM yyyy")}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Check-Out Date:</span>{" "}
                            {format(new Date(booking.endDate), "dd MMM yyyy")}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Number Of Guests:</span>{" "}
                            {booking.guests}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Room Assigned:</span>{" "}
                            {booking.room?.name || "—"}
                        </li>
                    </ul>

                </div>


            </div>
            {/* Payment Information */}
            <div className="grid grid-cols-2 gap-6 mt-2 border-b pb-6">
                <div className="mt-0">
                    <b className="block mb-2 text-gray-900">Payment Information:</b>

                    <ul className="list-disc list-inside text-gray-700 text-sm leading-relaxed space-y-1">
                        <li>
                            <span className="font-medium text-gray-800">Amount Paid:</span>{" "}
                            ₹{adminMeta?.amountPaid ?? booking.amount ?? 0}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Payment Mode:</span>{" "}
                            {adminMeta?.paymentMode || booking.paymentProvider || "Cash"}
                        </li>
                        <li>
                            <span className="font-medium text-gray-800">Transaction ID:</span>{" "}
                            {booking.paymentId || booking.orderId || "N/A"}
                        </li>
                    </ul>

                </div>


            </div>

            {/* GUEST CONSENT SECTION */}
            <div className="mt-4 pt-2 text-sm">
                <b className="block mb-2 text-gray-900">Guest Consent:</b>
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 border border-gray-400 rounded-sm mt-2"></div>
                    <p className="text-gray-600">
                        I confirm that the above details are true and correct and I have
                        read and agreed to the terms and conditions.
                    </p>
                </div>

                {/* Guest Signature Line */}
                <div className="mt-8">
                    <p className="text-gray-700">
                        Guest Signature: ________________________________
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        (Please sign after verifying the details)
                    </p>
                </div>
            </div>

            {/* FOOTER */}
            <div className="text-center text-sm text-gray-500 mt-10 pt-4 border-t">
                <b className="text-gray-800 block mb-1">Terms And Conditions:</b>
                Your use of the Website shall be deemed to constitute your understanding
                and approval of, and agreement to be bound by, the Privacy Policy and
                you consent to the collection.
            </div>
        </div>
    );
});

export default AdminInvoiceTemplate;

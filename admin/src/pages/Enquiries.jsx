import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/http";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";

export default function Enquiries() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const { data } = await api.get("/admin/enquiries");
      setEnquiries(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="md:space-y-6 md:mt-4 space-y-3 mt-0 w-[100%]">

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Guests</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {enquiries.map((e) => (
                <tr key={e._id} className="border-t">
                  <td className="p-3 font-medium">{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.phone}</td>
                  <td>{e.guests}</td>

                  <td>
                    {format(new Date(e.startDate), "dd MMM yyyy")} →
                    {format(new Date(e.endDate), "dd MMM yyyy")}
                  </td>

                  <td className="capitalize">{e.status}</td>

                  <td>
                    {format(new Date(e.createdAt), "dd MMM yyyy")}
                  </td>

                  <td>
                    {e.status === "enquiry" && (
                      <button
                        className="bg-primary text-white px-3 py-1 rounded-lg"
                        onClick={() =>
                          navigate(`/villa-booking?enquiryId=${e._id}`)
                        }
                      >
                        Book Villa
                      </button>
                    )}

                    {e.status === "booked" && e.bookingId && (
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded-lg"
                        onClick={() =>
                          navigate(`/bookings/${e.bookingId}`)
                        }
                      >
                        View Booking
                      </button>
                    )}

                    {e.status === "rejected" && (
                      <span className="text-gray-500">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {enquiries.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              No enquiries found
            </div>
          )}
        </div>

        {/* ================= MOBILE CARDS ================= */}
        <div className="md:hidden space-y-4">
          {enquiries.map((e) => (
            <div
              key={e._id}
              className="bg-white border rounded-xl p-4 space-y-2"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-base">{e.name}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                  {e.status}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <p>📞 {e.phone}</p>
                <p>✉️ {e.email}</p>
                <p>👥 Guests: {e.guests}</p>
              </div>

              <div className="text-sm">
                <p>
                  📅{" "}
                  {format(new Date(e.startDate), "dd MMM")} →{" "}
                  {format(new Date(e.endDate), "dd MMM yyyy")}
                </p>

                <p className="text-gray-500 text-xs">
                  Created: {format(new Date(e.createdAt), "dd MMM yyyy")}
                </p>
              </div>

              <div className="pt-2">
                {e.status === "enquiry" && (
                  <button
                    className="w-full bg-primary text-white py-2 rounded-lg"
                    onClick={() =>
                      navigate(`/villa-booking?enquiryId=${e._id}`)
                    }
                  >
                    Book Villa
                  </button>
                )}

                {e.status === "booked" && e.bookingId && (
                  <button
                    className="w-full bg-green-600 text-white py-2 rounded-lg"
                    onClick={() =>
                      navigate(`/bookings/${e.bookingId}`)
                    }
                  >
                    View Booking
                  </button>
                )}

                {e.status === "rejected" && (
                  <span className="text-sm text-gray-500">Closed</span>
                )}
              </div>
            </div>
          ))}

          {enquiries.length === 0 && (
            <div className="text-center text-muted-foreground">
              No enquiries found
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
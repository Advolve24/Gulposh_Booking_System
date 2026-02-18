import { useEffect, useState } from "react";
import { api } from "@/api/http";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import App from "@/App";

export default function Enquiries() {
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
    <div className="space-y-6 mt-4">

      <div className="bg-white rounded-xl border overflow-x-auto">
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
                <td>{e.status}</td>
                <td>
                  {format(new Date(e.createdAt), "dd MMM yyyy")}
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
    </div>
    </AppLayout>
  );
}

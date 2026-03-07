import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart,
    Pie, Cell, BarChart, Bar
} from "recharts";
import {
    getOverview, getMonthlyRevenue, getRevenueByRoom, getPaymentStatus, getBookingSources,
    getMealRevenue, getTopGuests
} from "@/api/admin";
import StatCard from "@/components/StatCard";
import AppLayout from "@/components/layout/AppLayout";
import { ChevronDown, Download } from "lucide-react";

const COLORS = ["#6B2737", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];


function ReportControls() {
    const [range, setRange] = useState("Last 6 Months");
    const [open, setOpen] = useState(false);

    const options = [
        "Last 30 Days",
        "Last 3 Months",
        "Last 6 Months",
        "Last Year",
    ];

    return (
        <div className="flex items-start justify-between">
            <div>
                <p className="text-[15px] text-[#6b7280]">
                    Analytics and insights for your property
                </p>
            </div>

            <div className="relative flex items-center gap-3">
                <button
                    onClick={() => setOpen(!open)}
                    className="flex h-11 min-w-[160px] items-center justify-between rounded-[10px] border border-[#ded8d3] bg-white px-4 text-[15px] font-medium text-[#1f2937] shadow-sm"
                >
                    <span>{range}</span>
                    <ChevronDown size={18} className="text-[#6b7280]" />
                </button>

                {open && (
                    <div className="absolute right-[92px] top-[52px] z-20 w-[164px] overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-lg">
                        {options.map((o) => {
                            const active = range === o;

                            return (
                                <button
                                    key={o}
                                    onClick={() => {
                                        setRange(o);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center px-4 py-3 text-left text-[15px] ${active
                                        ? "bg-[#2f9e75] text-white"
                                        : "bg-white text-[#374151] hover:bg-[#f9fafb]"
                                        }`}
                                >
                                    {active && <span className="mr-2 text-base">✓</span>}
                                    <span>{o}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <button className="flex h-11 items-center gap-2 rounded-[10px] border border-[#ded8d3] bg-white px-4 text-[15px] font-medium text-[#111827] shadow-sm">
                    <Download size={16} />
                    <span>Export</span>
                </button>
            </div>
        </div>
    );
}


export default function Reports() {

    const [overview, setOverview] = useState(null);
    const [monthly, setMonthly] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [payment, setPayment] = useState([]);
    const [sources, setSources] = useState([]);
    const [meal, setMeal] = useState({});
    const [guests, setGuests] = useState([]);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {

        const o = await getOverview();
        setOverview(o);

        setMonthly(await getMonthlyRevenue());
        setRooms(await getRevenueByRoom());
        setPayment(await getPaymentStatus());
        setSources(await getBookingSources());
        setMeal(await getMealRevenue());
        setGuests(await getTopGuests());

    };

    if (!overview) return <div className="p-10">Loading...</div>;

    return (
        <AppLayout>

            <div className="p-0 space-y-6">

                {/* HEADER */}

                <div className="space-y-6">
                    <ReportControls />
                </div>

                {/* STAT CARDS */}

                <div className="grid grid-cols-4 gap-4">

                    <StatCard
                        title="Total Revenue"
                        value={`₹${overview.totalRevenue}`}
                        subtitle="Last 6 months"
                        trend="+12% from last period"
                        icon="revenue"
                        variant="revenue"
                    />

                    <StatCard
                        title="Total Bookings"
                        value={overview.totalBookings}
                        subtitle="Confirmed stays"
                        trend="+8% from last period"
                        icon="bookings"
                    />

                    <StatCard
                        title="Avg. Occupancy"
                        value="70%"
                        subtitle="Across all rooms"
                        trend="+5% from last period"
                        icon="occupancy"
                    />

                    <StatCard
                        title="Avg. Revenue/Booking"
                        value={`₹${Math.round(overview.avgRevenuePerBooking)}`}
                        subtitle="Per confirmed booking"
                        trend="-3% from last period"
                        icon="avg"
                        variant="green"
                    />
                </div>

                {/* ROW 1 */}

                <div className="grid grid-cols-3 gap-6">

                    {/* MONTHLY REVENUE */}

                    <div className="col-span-2 bg-white p-6 border rounded-xl">

                        <h3 className="font-semibold mb-4">
                            Monthly Revenue
                        </h3>

                        <ResponsiveContainer width="100%" height={280}>

                            <LineChart data={monthly}>

                                <XAxis dataKey="_id.month" />

                                <YAxis />

                                <Tooltip />

                                <Line
                                    dataKey="totalRevenue"
                                    stroke="#6B2737"
                                    strokeWidth={3}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                    {/* ROOM REVENUE */}

                    {/* ROOM REVENUE */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="text-[18px] font-semibold text-[#1f2937] mb-0">
                            Revenue by Room
                        </h3>

                        <div className="flex flex-col items-center">

                            {/* DONUT CHART */}

                            <PieChart width={240} height={220}>

                                <Pie
                                    data={rooms}
                                    dataKey="revenue"
                                    nameKey="roomName"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    stroke="none"
                                >

                                    {rooms.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}

                                </Pie>

                            </PieChart>

                            {/* LEGEND */}

                            <div className="w-full mt-0 space-y-2">

                                {rooms.map((room, index) => (

                                    <div
                                        key={index}
                                        className="flex items-center justify-between text-[14px]"
                                    >

                                        <div className="flex items-center gap-3">

                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: COLORS[index % COLORS.length] }}
                                            />

                                            <span className="text-[#374151]">
                                                {room.roomName}
                                            </span>

                                        </div>

                                        <span className="font-medium text-[#111827]">
                                            ₹{room.revenue.toLocaleString()}
                                        </span>

                                    </div>

                                ))}

                            </div>

                        </div>

                    </div>

                </div>

                {/* ROW 2 */}

                <div className="grid grid-cols-3 gap-6">

                    {/* OCCUPANCY */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="mb-4 font-semibold">
                            Occupancy Rate
                        </h3>

                        <ResponsiveContainer width="100%" height={200}>

                            <BarChart data={monthly}>

                                <XAxis dataKey="_id.month" />

                                <YAxis />

                                <Bar dataKey="totalRevenue" fill="#10B981" />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                    {/* BOOKING SOURCES */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="font-semibold mb-4">
                            Booking Sources
                        </h3>

                        <PieChart width={250} height={200}>

                            <Pie
                                data={sources}
                                dataKey="count"
                                nameKey="_id"
                                outerRadius={80}
                            >

                                {sources.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}

                            </Pie>

                        </PieChart>

                    </div>

                    {/* PAYMENT STATUS */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="font-semibold mb-4">
                            Payment Status
                        </h3>

                        <PieChart width={250} height={200}>

                            <Pie
                                data={payment}
                                dataKey="count"
                                nameKey="_id"
                                outerRadius={80}
                            >

                                {payment.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}

                            </Pie>

                        </PieChart>

                    </div>

                </div>

                {/* ROW 3 */}

                <div className="grid grid-cols-2 gap-6">

                    {/* MEAL REVENUE */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="font-semibold mb-4">
                            Meal Revenue Breakdown
                        </h3>

                        <BarChart
                            width={500}
                            height={250}
                            data={[
                                {
                                    veg: meal.vegRevenue || 0,
                                    nonVeg: meal.nonVegRevenue || 0
                                }
                            ]}
                        >

                            <XAxis dataKey="name" />

                            <YAxis />

                            <Tooltip />

                            <Bar dataKey="veg" fill="#10B981" />

                            <Bar dataKey="nonVeg" fill="#F59E0B" />

                        </BarChart>

                    </div>

                    {/* TOP GUESTS */}

                    <div className="bg-white p-6 border rounded-xl">

                        <h3 className="font-semibold mb-4">
                            Top Guests
                        </h3>

                        <table className="w-full text-sm">

                            <thead className="border-b">

                                <tr>

                                    <th className="text-left py-2">
                                        Guest
                                    </th>

                                    <th>
                                        Bookings
                                    </th>

                                    <th>
                                        Spent
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {guests.map((g, i) => (

                                    <tr key={i} className="border-b">

                                        <td className="py-2">
                                            {g.guest}
                                        </td>

                                        <td>
                                            {g.bookings}
                                        </td>

                                        <td>
                                            ₹{g.totalSpent}
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>
        </AppLayout>
    );
}
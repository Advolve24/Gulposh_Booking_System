import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    CartesianGrid,
    Area,
} from "recharts";
import {
    getOverview,
    getMonthlyRevenue,
    getRevenueByRoom,
    getPaymentStatus,
    getBookingSources,
    getMealRevenue,
    getTopGuests,
} from "@/api/admin";
import StatCard from "@/components/StatCard";
import AppLayout from "@/components/layout/AppLayout";
import { ChevronDown, Download } from "lucide-react";

const COLORS = ["#6B2737", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const SOURCE_COLORS = {
    Direct: "#6B2737",
    Enquiry: "#2f8f6b",
    "Repeat Guest": "#3b82f6",
};

const PAYMENT_COLORS = {
    Paid: "#2f8f6b",
    Cancelled: "#dc2626",
    Pending: "#f59e0b",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

function ReportControls({ range, setRange, exportCSV }) {
    const [open, setOpen] = useState(false);

    const options = [
        "Last 30 Days",
        "Last 3 Months",
        "Last 6 Months",
        "Last Year",
    ];

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="pr-0 lg:pr-6">
                <p className="text-[15px] text-[#6b7280]">
                    Analytics and insights for your property
                </p>
            </div>

            <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:self-start">
                <button
                    onClick={() => setOpen((prev) => !prev)}
                    className="flex h-11 w-full min-w-0 items-center justify-between rounded-[10px] border border-[#ded8d3] bg-white px-4 text-[15px] font-medium text-[#1f2937] shadow-sm sm:min-w-[160px]"
                >
                    <span>{range}</span>
                    <ChevronDown size={18} className="text-[#6b7280]" />
                </button>

                {open && (
                    <div className="absolute left-0 top-[52px] z-20 w-full overflow-hidden rounded-[10px] border border-[#e5e7eb] bg-white shadow-lg sm:left-auto sm:right-[92px] sm:w-[164px]">
                        {options.map((option) => {
                            const active = range === option;

                            return (
                                <button
                                    key={option}
                                    onClick={() => {
                                        setRange(option);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center px-4 py-3 text-left text-[15px] ${
                                        active
                                            ? "bg-[#2f9e75] text-white"
                                            : "bg-white text-[#374151] hover:bg-[#f9fafb]"
                                    }`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={exportCSV}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#ded8d3] bg-white px-4 text-[15px] font-medium text-[#111827] shadow-sm sm:w-auto"
                >
                    <Download size={16} />
                    Export
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
    const [meal, setMeal] = useState([]);
    const [range, setRange] = useState("Last 6 Months");
    const [guests, setGuests] = useState([]);

    useEffect(() => {
        loadReports();
    }, [range]);

    const loadReports = async () => {
        const overviewData = await getOverview(range);
        setOverview(overviewData);
        setMonthly(await getMonthlyRevenue(range));
        setRooms(await getRevenueByRoom(range));
        setPayment(await getPaymentStatus(range));
        setSources(await getBookingSources(range));
        setMeal(await getMealRevenue(range));
        setGuests(await getTopGuests(range));
    };

    const exportCSV = () => {
        const rows = [["Month", "Revenue", "Bookings", "Occupancy"]];

        monthly.forEach((month) => {
            rows.push([
                MONTHS[month._id.month - 1],
                month.totalRevenue,
                month.bookings,
                `${month.occupancy}%`,
            ]);
        });

        const csvContent =
            "data:text/csv;charset=utf-8," + rows.map((entry) => entry.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.href = encodedUri;
        link.download = "revenue-report.csv";
        document.body.appendChild(link);
        link.click();
    };

    if (!overview) {
        return <div className="p-10">Loading...</div>;
    }

    return (
        <AppLayout>
            <div className="w-full space-y-6">
                <div className="space-y-6">
                    <ReportControls
                        range={range}
                        setRange={setRange}
                        exportCSV={exportCSV}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(overview.totalRevenue)}
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
                        value={formatCurrency(Math.round(overview.avgRevenuePerBooking))}
                        subtitle="Per confirmed booking"
                        trend="-3% from last period"
                        icon="avg"
                        variant="green"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="min-w-0 border rounded-xl bg-white p-4 sm:p-6 xl:col-span-2">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-[18px] font-semibold text-[#1f2937]">
                                Monthly Revenue
                            </h3>

                            <div className="w-fit rounded-full bg-[#f3f4f6] px-3 py-1 text-[12px] font-medium text-[#374151]">
                                Rs INR
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6B2737" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#6B2737" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#e5e7eb"
                                />

                                <XAxis
                                    dataKey="_id.month"
                                    tickFormatter={(month) => MONTHS[month - 1]}
                                    axisLine={{ stroke: "#9ca3af" }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                />

                                <YAxis
                                    tickFormatter={(value) => `Rs ${Math.round(value / 1000)}K`}
                                    axisLine={{ stroke: "#9ca3af" }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    width={55}
                                />

                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    labelFormatter={(label) => MONTHS[label - 1]}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                    }}
                                />

                                <Area
                                    type="monotone"
                                    dataKey="totalRevenue"
                                    stroke="none"
                                    fill="url(#revenueGradient)"
                                />

                                <Line
                                    type="monotone"
                                    dataKey="totalRevenue"
                                    stroke="#6B2737"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#6B2737" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-0 text-[18px] font-semibold text-[#1f2937]">
                            Revenue by Room
                        </h3>

                        <div className="flex flex-col items-center">
                            <PieChart width={220} height={220}>
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
                                            key={entry.roomName || index}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>

                            <div className="mt-2 w-full space-y-2">
                                {rooms.map((room, index) => (
                                    <div
                                        key={room.roomName || index}
                                        className="flex items-start justify-between gap-3 text-[14px]"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full"
                                                style={{ background: COLORS[index % COLORS.length] }}
                                            />

                                            <span className="truncate text-[#374151]">
                                                {room.roomName}
                                            </span>
                                        </div>

                                        <span className="shrink-0 font-medium text-[#111827]">
                                            {formatCurrency(room.revenue)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="min-w-0 border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
                            Occupancy Rate
                        </h3>

                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthly} barSize={36}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#e5e7eb"
                                />

                                <XAxis
                                    dataKey="_id.month"
                                    tickFormatter={(month) => MONTHS[month - 1]}
                                    axisLine={{ stroke: "#9ca3af" }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                />

                                <YAxis
                                    domain={[0, 100]}
                                    tickFormatter={(value) => `${value}%`}
                                    axisLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    width={40}
                                />

                                <Tooltip
                                    formatter={(value) => `${value}%`}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                    }}
                                />

                                <Bar
                                    dataKey="occupancy"
                                    fill="#2f8f6b"
                                    radius={[6, 6, 0, 0]}
                                    activeBar={{ fill: "#1f7f5f" }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
                            Booking Sources
                        </h3>

                        <div className="flex flex-col items-center">
                            <PieChart width={220} height={180}>
                                <Pie
                                    data={sources}
                                    dataKey="count"
                                    nameKey="_id"
                                    outerRadius={70}
                                    paddingAngle={2}
                                    cursor="pointer"
                                >
                                    {sources.map((entry, index) => (
                                        <Cell
                                            key={entry._id || index}
                                            fill={SOURCE_COLORS[entry._id] || COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip formatter={(value, name) => `${name} : ${value}`} />
                            </PieChart>

                            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px]">
                                {sources.map((source, index) => {
                                    const total = sources.reduce((sum, item) => sum + item.count, 0) || 1;
                                    const percent = Math.round((source.count / total) * 100);

                                    return (
                                        <div key={source._id || index} className="flex items-center gap-2">
                                            <span
                                                className="h-[10px] w-[10px] rounded-full"
                                                style={{
                                                    background:
                                                        SOURCE_COLORS[source._id] || COLORS[index % COLORS.length],
                                                }}
                                            />

                                            <span className="text-[11px] text-[#374151]">
                                                {source._id} ({percent}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
                            Payment Status
                        </h3>

                        <div className="flex flex-col items-center">
                            <PieChart width={220} height={180}>
                                <Pie
                                    data={payment}
                                    dataKey="count"
                                    nameKey="_id"
                                    outerRadius={70}
                                    paddingAngle={2}
                                >
                                    {payment.map((entry, index) => (
                                        <Cell
                                            key={entry._id || index}
                                            fill={PAYMENT_COLORS[entry._id] || COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip formatter={(value, name) => `${name} : ${value}`} />
                            </PieChart>

                            <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px]">
                                {payment.map((status, index) => (
                                    <div key={status._id || index} className="flex items-center gap-2">
                                        <span
                                            className="h-[10px] w-[10px] rounded-full"
                                            style={{
                                                background:
                                                    PAYMENT_COLORS[status._id] || COLORS[index % COLORS.length],
                                            }}
                                        />

                                        <span className="text-[11px] text-[#374151]">
                                            {status._id} ({status.count})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                    <div className="min-w-0 border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
                            Meal Revenue Breakdown
                        </h3>

                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={meal} barSize={26}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#e5e7eb"
                                />

                                <XAxis
                                    dataKey="_id.month"
                                    tickFormatter={(month) => MONTHS[month - 1]}
                                    axisLine={{ stroke: "#9ca3af" }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                />

                                <YAxis
                                    tickFormatter={(value) => `Rs ${Math.round(value / 1000)}K`}
                                    axisLine={{ stroke: "#9ca3af" }}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: "#6b7280" }}
                                    width={55}
                                />

                                <Tooltip
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                    }}
                                />

                                <Bar
                                    dataKey="veg"
                                    fill="#2f8f6b"
                                    radius={[6, 6, 0, 0]}
                                />

                                <Bar
                                    dataKey="nonVeg"
                                    fill="#f59e0b"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px]">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm bg-[#2f8f6b]" />
                                <span className="text-[#374151]">Veg</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-sm bg-[#f59e0b]" />
                                <span className="text-[#374151]">Non-Veg</span>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl bg-white p-4 sm:p-6">
                        <h3 className="mb-4 font-semibold">
                            Top Guests
                        </h3>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="border-b text-[13px] text-[#6b7280]">
                                    <tr>
                                        <th className="py-2 text-left">Guest</th>
                                        <th className="text-center">Bookings</th>
                                        <th className="text-left">Phone</th>
                                        <th className="text-right">Total Spent</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {guests.map((guest, index) => (
                                        <tr key={guest._id || index} className="border-b last:border-0">
                                            <td className="flex items-center gap-3 py-3">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                                                    {index + 1}
                                                </span>

                                                <span>{guest.guest}</span>
                                            </td>

                                            <td className="text-center">
                                                {guest.bookings}
                                            </td>

                                            <td className="text-gray-500">
                                                {guest._id}
                                            </td>

                                            <td className="text-right font-medium">
                                                {formatCurrency(guest.totalSpent)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 md:hidden">
                            {guests.map((guest, index) => (
                                <div
                                    key={guest._id || index}
                                    className="rounded-xl border border-[#e5e7eb] p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                                                {index + 1}
                                            </span>

                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-[#111827]">
                                                    {guest.guest}
                                                </p>
                                                <p className="truncate text-sm text-gray-500">
                                                    {guest._id}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xs uppercase tracking-wide text-[#6b7280]">
                                                Bookings
                                            </p>
                                            <p className="font-medium text-[#111827]">
                                                {guest.bookings}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 border-t border-[#f3f4f6] pt-3">
                                        <p className="text-xs uppercase tracking-wide text-[#6b7280]">
                                            Total Spent
                                        </p>
                                        <p className="text-base font-semibold text-[#111827]">
                                            {formatCurrency(guest.totalSpent)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

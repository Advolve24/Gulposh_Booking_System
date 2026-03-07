import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie,
         Cell, BarChart, Bar} from "recharts";
import { getOverview, getMonthlyRevenue, getRevenueByRoom, getPaymentStatus, getBookingSources,
         getMealRevenue, getTopGuests} from "@/api/admin";
import StatCard from "@/components/StatCard";
import AppLayout from "@/components/layout/AppLayout";

const COLORS = [
"#6B2737",
"#3B82F6",
"#10B981",
"#F59E0B",
"#EF4444"
];

export default function Reports() {

const [overview,setOverview]=useState(null);
const [monthly,setMonthly]=useState([]);
const [rooms,setRooms]=useState([]);
const [payment,setPayment]=useState([]);
const [sources,setSources]=useState([]);
const [meal,setMeal]=useState({});
const [guests,setGuests]=useState([]);

useEffect(()=>{
loadReports();
},[]);

const loadReports = async ()=>{

const o = await getOverview();
setOverview(o);

setMonthly(await getMonthlyRevenue());
setRooms(await getRevenueByRoom());
setPayment(await getPaymentStatus());
setSources(await getBookingSources());
setMeal(await getMealRevenue());
setGuests(await getTopGuests());

};

if(!overview) return <div className="p-10">Loading...</div>;

return (
<AppLayout>

<div className="p-6 space-y-6">

{/* HEADER */}

<div>
<h1 className="text-2xl font-semibold">Reports</h1>
<p className="text-sm text-gray-500">
Analytics and insights for your property
</p>
</div>

{/* STAT CARDS */}

<div className="grid grid-cols-4 gap-4">

<StatCard
title="Total Revenue"
value={`₹${overview.totalRevenue}`}
color="bg-[#6B2737] text-white"
/>

<StatCard
title="Total Bookings"
value={overview.totalBookings}
/>

<StatCard
title="Avg Occupancy"
value="70%"
/>

<StatCard
title="Avg Revenue / Booking"
value={`₹${Math.round(overview.avgRevenuePerBooking)}`}
color="bg-green-600 text-white"
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

<XAxis dataKey="_id.month"/>

<YAxis/>

<Tooltip/>

<Line
dataKey="totalRevenue"
stroke="#6B2737"
strokeWidth={3}
/>

</LineChart>

</ResponsiveContainer>

</div>

{/* ROOM REVENUE */}

<div className="bg-white p-6 border rounded-xl">

<h3 className="font-semibold mb-4">
Revenue by Room
</h3>

<PieChart width={260} height={260}>

<Pie
data={rooms}
dataKey="revenue"
nameKey="roomName"
outerRadius={90}
>

{rooms.map((entry,index)=>(
<Cell
key={index}
fill={COLORS[index % COLORS.length]}
/>
))}

</Pie>

</PieChart>

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

<XAxis dataKey="_id.month"/>

<YAxis/>

<Bar dataKey="totalRevenue" fill="#10B981"/>

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

{sources.map((entry,index)=>(
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

{payment.map((entry,index)=>(
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

<XAxis dataKey="name"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="veg" fill="#10B981"/>

<Bar dataKey="nonVeg" fill="#F59E0B"/>

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

{guests.map((g,i)=>(

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
import { MoreVertical, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

export default function MobileUserCard({
  user,
  onView,
  onEdit,
  onDelete,
  onBookings
}) {
  return (
    <div
      onClick={onView}
      className="
        rounded-2xl border bg-background p-4 shadow-sm space-y-3
        cursor-pointer
        active:bg-muted/40
        transition
      "
    >
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold leading-tight">
            {user.name || "Unnamed User"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {user.email || "No email"}
          </p>
        </div>

        {/* ACTION MENU — stop card click */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-white" align="end">
              <DropdownMenuItem onClick={onView}>View</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onBookings}>
                See all bookings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* META */}
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span>{user.phone || user.mobile || "—"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>DOB: {fmt(user.dob)}</span>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          Created {fmt(user.createdAt)}
        </span>
      </div>
    </div>
  );
}

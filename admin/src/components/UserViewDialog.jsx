import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X, Mail, Phone, Calendar, User } from "lucide-react";
import { format } from "date-fns";

const fmt = (d) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

export default function UserViewDialog({ open, onOpenChange, user }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          md:max-w-md
          w-[95vw]
          p-0
          rounded-2xl
          overflow-hidden
          [&>button]:hidden
        "
      >
        {!user ? (
          <div className="py-10 text-center text-muted-foreground">
            Loading user details…
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="relative p-5 border-b">
              <h2 className="text-xl font-semibold">
                {user.name || "User"}
              </h2>
              <p className="text-xs text-muted-foreground">
                User ID: {user._id.slice(-6)}
              </p>

              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full border flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            {/* BODY */}
            <div className="px-5 pb-5 space-y-4 text-sm">
              {/* BASIC INFO */}
              <div>
                <span className="inline-block mb-2 text-xs px-3 py-1 bg-muted rounded-full">
                  BASIC DETAILS
                </span>

                <div className="space-y-2">
                  <Row icon={User} value={user.name || "—"} />
                  <Row icon={Mail} value={user.email || "—"} />
                  <Row icon={Phone} value={user.phone || user.mobile || "—"} />
                </div>
              </div>

              <hr />

              {/* PERSONAL INFO */}
              <div>
                <span className="inline-block mb-2 text-xs px-3 py-1 bg-muted rounded-full">
                  PERSONAL INFO
                </span>

                <div className="space-y-2">
                  <Row
                    icon={Calendar}
                    label="Date of Birth"
                    value={fmt(user.dob)}
                  />
                  <Row
                    icon={Calendar}
                    label="Joined On"
                    value={fmt(user.createdAt)}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 text-muted-foreground" />
      <div>
        {label && (
          <p className="text-xs text-muted-foreground">
            {label}
          </p>
        )}
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, Droplets, Users, MapPin, FileCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/irigasi", icon: Droplets, label: "Irigasi" },
];

const adminItems = [
  { to: "/admin/review", icon: FileCheck, label: "Review" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
  { to: "/admin/areas", icon: MapPin, label: "Area" },
];

export default function BottomNav() {
  const { user } = useAuthStore();
  const allItems = user?.role === "super_admin" ? [...items, ...adminItems] : items;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex">
        {allItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

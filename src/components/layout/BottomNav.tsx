import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, Users, MapPin, FileCheck, ListChecks, UploadCloud, History, Shield, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/usulan", icon: ListChecks, label: "Usulan" },
  { to: "/irigasi", icon: UploadCloud, label: "Upload" },
  { to: "/riwayat", icon: History, label: "Riwayat" },
];

const adminItems = [
  { to: "/admin/areas", icon: MapPin, label: "Area" },
  { to: "/admin/kegiatan", icon: ListChecks, label: "Kegiatan" },
  { to: "/admin/review", icon: FileCheck, label: "Review" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
];

export default function BottomNav() {
  const { user } = useAuthStore();
  const [showAdmin, setShowAdmin] = useState(false);

  if (user?.role !== "super_admin") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex">
        {showAdmin ? (
          <>
            <button onClick={() => setShowAdmin(false)} className="flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
              Kembali
            </button>
            {adminItems.map((item) => (
              <NavLink key={item.to} to={item.to} end onClick={() => setShowAdmin(false)} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </>
        ) : (
          <>
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
            <button onClick={() => setShowAdmin(true)} className="flex flex-col items-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors text-muted-foreground">
              <Shield className="h-5 w-5" />
              Admin
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

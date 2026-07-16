import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, Droplets, Users, MapPin, FileCheck, ListChecks, PanelLeftClose, PanelLeft, UploadCloud, History } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/usulan", icon: ListChecks, label: "Usulan Kegiatan" },
  { to: "/irigasi", icon: UploadCloud, label: "Upload Dokumen" },
  { to: "/riwayat", icon: History, label: "Riwayat Daerah Irigasi" },
];

const adminItems = [
  { to: "/admin/review", icon: FileCheck, label: "Review Dokumen" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
  { to: "/admin/areas", icon: MapPin, label: "Daerah Irigasi" },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:block top-14 left-0 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex justify-end pt-2 pr-2">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed((v) => !v)} className="h-7 w-7">
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="space-y-1 p-3">
        {!collapsed && <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">Utama</p>}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </NavLink>
        ))}
        {user?.role === "super_admin" && (
          <>
            {!collapsed && <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider pt-4">Admin</p>}
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

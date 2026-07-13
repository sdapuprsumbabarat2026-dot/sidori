import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LayoutDashboard, Droplets, Users, MapPin, FileCheck, PanelLeftClose, PanelLeft, X } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/irigasi", icon: Droplets, label: "Jenis Irigasi" },
];

const adminItems = [
  { to: "/admin/review", icon: FileCheck, label: "Review Dokumen" },
  { to: "/admin/users", icon: Users, label: "Pengguna" },
  { to: "/admin/areas", icon: MapPin, label: "Daerah Irigasi" },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-200",
          "md:translate-x-0 md:static md:h-auto",
          collapsed ? "w-16" : "w-60",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 md:hidden">
          <span className="font-semibold">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="hidden md:flex justify-end pt-2 pr-2">
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
              onClick={onClose}
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
                  onClick={onClose}
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
    </>
  );
}

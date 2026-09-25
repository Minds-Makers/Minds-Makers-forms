import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LayoutGrid, ListChecks, Users, Settings, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/forms", label: "Forms", icon: ListChecks },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  const nav = (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors ${
              isActive ? "bg-cyan-soft text-cyan" : "text-muted hover:text-ink hover:bg-field"
            }`
          }
        >
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 border-r border-line bg-card shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-line">
          <div className="w-[30px] h-[30px] rounded-sm bg-cyan-soft border border-cyan/45 flex items-center justify-center text-cyan text-xs font-bold">
            MM
          </div>
          <span className="font-head font-bold">Minds Makers</span>
        </div>
        <div className="flex-1 py-4">{nav}</div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-6 py-4 text-sm text-muted hover:text-err border-t border-line"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-line flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-line">
              <span className="font-head font-bold">Minds Makers</span>
              <button onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 py-4">{nav}</div>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-6 py-4 text-sm text-muted hover:text-err border-t border-line"
            >
              <LogOut size={16} /> Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-line bg-card">
          <button onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="font-head font-bold">Minds Makers</span>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

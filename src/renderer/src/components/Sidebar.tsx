import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Clock,
  Layers,
  Plus,
} from "lucide-react";
import QuickAddModal from "./QuickAddModal";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/ledger", icon: Layers, label: "All Transactions", end: false },
  { to: "/debit", icon: TrendingDown, label: "Debit", end: false },
  { to: "/credit", icon: TrendingUp, label: "Credit", end: false },
  { to: "/projects", icon: Briefcase, label: "Projects", end: false },
  { to: "/history", icon: Clock, label: "History", end: false },
];

export default function Sidebar() {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <>
      <aside className="w-56 bg-slate-900 flex flex-col h-full shadow-xl">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">
                Accounts
              </p>
              <p className="text-slate-400 text-xs mt-0.5">Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>
        <div className="px-4 pb-4">
          <p className="text-slate-500 text-xs text-center">P-Dashboard v1.0</p>
        </div>
      </aside>
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
    </>
  );
}

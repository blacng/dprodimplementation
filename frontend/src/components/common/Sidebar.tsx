import { NavLink } from 'react-router-dom';
// Direct imports to avoid barrel file bundle bloat
import Database from 'lucide-react/dist/esm/icons/database';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle';
import Home from 'lucide-react/dist/esm/icons/home';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/catalog', icon: Database, label: 'Catalog' },
  { to: '/lineage', icon: GitBranch, label: 'Lineage' },
  { to: '/quality', icon: CheckCircle, label: 'Quality' },
  { to: '/register', icon: PlusCircle, label: 'Register' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
            <Database className="text-cyan-400" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-white">DPROD</h2>
            <p className="text-xs text-slate-500">Data Catalog</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-slate-400 hover:bg-slate-800'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-600 text-center">
          DPROD Catalog v1.0.0
        </p>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import {
  Database,
  GitBranch,
  CheckCircle,
  PlusCircle,
  Home,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/catalog', icon: Database, label: 'Catalog' },
  { to: '/lineage', icon: GitBranch, label: 'Lineage' },
  { to: '/quality', icon: CheckCircle, label: 'Quality' },
  { to: '/register', icon: PlusCircle, label: 'Register' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Database className="text-white" size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">DPROD</h2>
            <p className="text-xs text-gray-500">Data Catalog</p>
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
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          DPROD Catalog v1.0.0
        </p>
      </div>
    </aside>
  );
}

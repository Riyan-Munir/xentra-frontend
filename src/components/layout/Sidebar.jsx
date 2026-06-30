import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings, Briefcase, FileText, Server, PenTool } from 'lucide-react'

const roleMenus = {
  freelancer: [
    { to: 'overview', label: 'Overview', icon: LayoutDashboard },
    { to: 'settings', label: 'Settings', icon: Settings },
    { to: 'portfolio', label: 'Portfolio', icon: PenTool },
    { to: 'applications', label: 'Applications', icon: FileText },
  ],
  client: [
    { to: 'overview', label: 'Overview', icon: LayoutDashboard },
    { to: 'settings', label: 'Settings', icon: Settings },
    { to: 'jobs', label: 'Jobs', icon: Briefcase },
  ],
  server_admin: [
    { to: 'overview', label: 'Overview', icon: LayoutDashboard },
    { to: 'settings', label: 'Settings', icon: Settings },
    { to: 'configure', label: 'Configure', icon: Server },
  ],
}

export default function Sidebar({ role, currentRole, onRoleSwitch }) {
  const items = roleMenus[role] || roleMenus.freelancer

  return (
    <aside className="w-56 shrink-0 min-h-screen glass rounded-none border-l-0 border-y-0 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Xentra
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
              ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

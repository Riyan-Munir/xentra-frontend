import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function DashboardLayout({ profile, role, onRoleSwitch, children }) {
    return (
        <div className="flex min-h-screen bg-bg">
            <Sidebar role={role} onRoleSwitch={onRoleSwitch} />
            <div className="flex-1 flex flex-col">
                <Navbar profile={profile} role={role} onRoleSwitch={onRoleSwitch} />
                <main className="flex-1 p-6 overflow-y-auto max-w-6xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}

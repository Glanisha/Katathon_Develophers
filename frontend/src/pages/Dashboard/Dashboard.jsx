import { Map, Home, Users, Settings, AlertCircle } from "lucide-react";
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../../components/ui/sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import MapComponent from './Map';
 
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar"

// Menu items
const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Map", url: "/dashboard/map", icon: Map },
  { title: "Friends", url: "/dashboard/friends", icon: Users },
  { title: "Reports", url: "/dashboard/reports", icon: AlertCircle },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
]

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>SafeWalk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a 
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

// Page components (exported so App.jsx can route to them)
export const DashboardHome = () => {
  const { user } = useAuth();
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user?.name}!</h2>
      <p className="text-gray-600">Email: {user?.email}</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Total Walks</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900">Safety Score</h3>
          <p className="text-3xl font-bold text-green-600">--</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900">Friends</h3>
          <p className="text-3xl font-bold text-purple-600">{user?.friends?.length || 0}</p>
        </div>
      </div>
    </div>
  );
};

export const Friends = () => <div className="bg-white rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Friends</h2></div>;
export const Reports = () => <div className="bg-white rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Reports</h2></div>;
export const SettingsPage = () => <div className="bg-white rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Settings</h2></div>;

// Dashboard layout — renders whatever child page you pass from App.jsx
const Dashboard = ({ children }) => {
  const { logout } = useAuth();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-xl font-semibold">SafeWalk Dashboard</h1>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </header>
          <div className="flex-1 flex flex-col p-4">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
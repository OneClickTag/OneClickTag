"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/Logo"
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Menu,
  X,
  LogOut,
  Home,
  Layout,
  Settings,
  Mail,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronRight,
  Cookie,
  Database,
  FileCheck,
  Eye,
  Search,
  MapPin,
  LucideIcon
} from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavigationSubItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavigationItem {
  name: string
  href?: string
  icon: LucideIcon
  items?: NavigationSubItem[]
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    name: "User Management",
    icon: Users,
    items: [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Leads", href: "/admin/leads", icon: BarChart3 },
      { name: "Questionnaire", href: "/admin/questionnaire", icon: FileCheck },
    ],
  },
  {
    name: "Content",
    icon: FileText,
    items: [
      { name: "Pages", href: "/admin/content", icon: FileText },
      { name: "Static Pages", href: "/admin/static-pages", icon: FileText },
      { name: "Landing Page", href: "/admin/landing", icon: Layout },
      { name: "Contact Page", href: "/admin/contact-page", icon: Mail },
      { name: "Footer", href: "/admin/footer", icon: FileText },
    ],
  },
  {
    name: "Settings",
    icon: Settings,
    items: [
      { name: "Site Settings", href: "/admin/site-settings", icon: Settings },
      { name: "SEO & Sitemap", href: "/admin/seo", icon: Search },
      { name: "Plans", href: "/admin/plans", icon: CreditCard },
      { name: "Email Templates", href: "/admin/email-templates", icon: Mail },
    ],
  },
  {
    name: "Compliance",
    icon: Shield,
    items: [
      { name: "Settings", href: "/admin/compliance/settings", icon: Settings },
      { name: "Cookie Categories", href: "/admin/compliance/cookie-categories", icon: Cookie },
      { name: "Cookies", href: "/admin/compliance/cookies", icon: Cookie },
      { name: "Cookie Banner", href: "/admin/compliance/cookie-banner", icon: FileCheck },
      { name: "Data Requests", href: "/admin/compliance/data-requests", icon: Database },
      { name: "Audit Logs", href: "/admin/compliance/audit-logs", icon: Eye },
    ],
  },
]

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    "User Management": false,
    "Content": true,
    "Settings": false,
    "Compliance": true,
  })
  const pathname = usePathname()
  const router = useRouter()

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const handleLogout = () => {
    // Clear auth and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("oneclicktag_auth_tokens")
    }
    router.push("/login")
  }

  const getPageTitle = () => {
    // Check regular items first
    const regularItem = navigation.find(item => item.href === pathname)
    if (regularItem) return regularItem.name

    // Check sub-items in groups
    for (const item of navigation) {
      if (item.items) {
        const subItem = item.items.find(sub => sub.href === pathname)
        if (subItem) return `${item.name} - ${subItem.name}`
      }
    }

    return "Admin"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <Link href="/">
              <Logo width={160} height={30} variant="light" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Admin Badge */}
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="bg-blue-900/50 text-blue-200 px-3 py-2 rounded-lg text-sm font-medium">
              Admin Panel
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon

              // Group with sub-items
              if (item.items) {
                const isExpanded = expandedGroups[item.name]
                const isGroupActive = item.items.some(
                  (subItem) => pathname === subItem.href
                )

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isGroupActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-1 ml-4 space-y-1">
                        {item.items.map((subItem) => {
                          const SubIcon = subItem.icon
                          const isActive = pathname === subItem.href
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                                isActive
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                              }`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <SubIcon className="w-4 h-4" />
                              <span className="font-medium">{subItem.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              // Regular navigation item
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="px-4 py-6 border-t border-gray-800 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Back to App</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Admin User</span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

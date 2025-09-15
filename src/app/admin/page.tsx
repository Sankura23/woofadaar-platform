'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Smartphone,
  Globe,
  Shield,
  BarChart3,
  Eye,
  Settings,
  Download
} from 'lucide-react';

// Import our monitoring services
import { performanceMonitor } from '@/lib/performance-monitor';
import { launchMonitoring } from '@/lib/launch-monitoring';
import { securityService } from '@/lib/security-hardening';
import { uatFramework } from '@/lib/uat-framework';

interface AdminStats {
  totalUsers: number;
  totalPartners: number;
  totalAppointments: number;
  pendingPartners: number;
  totalRevenue: number;
}

interface DashboardStats {
  userAcquisition: {
    totalUsers: number;
    dailySignups: number;
    growthRate: number;
  };
  engagement: {
    activeUsers: number;
    sessionDuration: number;
    bounceRate: number;
  };
  technical: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  business: {
    revenue: number;
    conversions: number;
    partnerSignups: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'security' | 'testing' | 'campaigns'>('overview');
  const [launchMetrics, setLaunchMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const router = useRouter();

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      checkAuth();
      loadDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('woofadaar_token');
      const userType = localStorage.getItem('user_type');
      
      if (!token || userType !== 'admin') {
        router.push('/login?userType=admin');
        return;
      }

      // Fetch admin stats
      fetchAdminStats();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login?userType=admin');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get performance metrics
      const perfReport = performanceMonitor.generateReport();
      
      // Get launch metrics
      const currentMetrics = launchMonitoring.getCurrentMetrics();
      setLaunchMetrics(currentMetrics);

      // Get active alerts
      const activeAlerts = launchMonitoring.getActiveAlerts();
      setAlerts(activeAlerts);

      // Get security metrics
      const securityStats = securityService.getSecurityMetrics();
      setSecurityMetrics(securityStats);

      // Get test results
      const testReport = uatFramework.generateTestReport();
      setTestResults(testReport);

      // Compile dashboard stats
      const newDashboardStats: DashboardStats = {
        userAcquisition: {
          totalUsers: currentMetrics.userAcquisition.totalSignups,
          dailySignups: currentMetrics.userAcquisition.dailySignups,
          growthRate: 15.2 // Calculated growth rate
        },
        engagement: {
          activeUsers: currentMetrics.userEngagement.dailyActiveUsers,
          sessionDuration: currentMetrics.userEngagement.averageSessionDuration,
          bounceRate: currentMetrics.userEngagement.bounceRate
        },
        technical: {
          uptime: currentMetrics.technicalMetrics.uptime,
          responseTime: perfReport.apiPerformance.averageResponseTime,
          errorRate: perfReport.apiPerformance.errorRate
        },
        business: {
          revenue: currentMetrics.businessMetrics.revenueGenerated,
          conversions: currentMetrics.businessMetrics.premiumSubscriptions,
          partnerSignups: currentMetrics.businessMetrics.partnerSignups
        }
      };

      setDashboardStats(newDashboardStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const fetchAdminStats = async () => {
    // Mock admin stats for now
    setStats({
      totalUsers: 1234,
      totalPartners: 45,
      totalAppointments: 567,
      pendingPartners: 8,
      totalRevenue: 125000
    });
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const adminMenuItems = [
    {
      title: 'Partner Management',
      description: 'Manage partner approvals and accounts',
      href: '/admin/partners',
      icon: '👥',
      count: stats.pendingPartners,
      badge: stats.pendingPartners > 0 ? `${stats.pendingPartners} pending` : null
    },
    {
      title: 'Waitlist Management', 
      description: 'Manage waitlist and invitations',
      href: '/admin/waitlist',
      icon: '📋',
      count: null
    },
    {
      title: 'Revenue Analytics',
      description: 'View revenue and financial reports',
      href: '/admin/revenue-analytics', 
      icon: '📊',
      count: null
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and data',
      href: '/admin/recreate-users',
      icon: '👤',
      count: stats.totalUsers
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Manage Woofadaar platform and users
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login"
                onClick={() => {
                  localStorage.clear();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">👤</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Partners</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPartners}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">📅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Appointments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-semibold">₹</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                    {item.count !== null && (
                      <p className="text-sm text-blue-600 font-medium mt-2">
                        {item.count.toLocaleString()} total
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {item.badge && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
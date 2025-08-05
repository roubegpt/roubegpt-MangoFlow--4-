import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  List, 
  Images, 
  Wifi, 
  WifiOff,
  Activity
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { isConnected } = useWebSocket();
  const [location] = useLocation();

  const navigation = [
    { name: '자동화 대시보드', href: '/', icon: LayoutDashboard, current: location === '/' },
    { name: '처리 대기열', href: '/queue', icon: List, current: location === '/queue' },
    { name: '처리 결과', href: '/results', icon: Images, current: location === '/results' },
    { name: '시스템 설정', href: '/settings', icon: Settings, current: location === '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">더망고 자동화</h1>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? '시스템 정상 가동중' : '연결 끊김'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="hidden md:flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            
            {/* User & Logout */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">{user?.username}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => logout()}
                className="text-primary hover:text-primary/80"
              >
                <LogOut className="w-4 h-4 mr-1" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <a className={`flex items-center space-x-3 p-3 rounded-lg font-medium transition-colors ${
                        item.current
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

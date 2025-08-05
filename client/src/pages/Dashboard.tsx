import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Upload, 
  Layers, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  Chrome,
  Brain,
  Database,
  HardDrive,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  type DashboardStats, 
  type SystemStatus, 
  type ProcessingStatus,
  type AutomationTask
} from '@shared/schema';

export default function Dashboard() {
  const { toast } = useToast();
  const { isConnected, lastMessage } = useWebSocket();
  const [isAutomationRunning, setIsAutomationRunning] = useState(false);

  // 대시보드 통계 조회
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 시스템 상태 조회
  const { data: systemStatus, isLoading: systemLoading } = useQuery<SystemStatus>({
    queryKey: ['/api/dashboard/system-status'],
    refetchInterval: 15000, // 15초마다 갱신
  });

  // 처리 상태 조회
  const { data: processingStatus, isLoading: processingLoading } = useQuery<ProcessingStatus>({
    queryKey: ['/api/dashboard/processing-status'],
    refetchInterval: 5000, // 5초마다 갱신
  });

  // 큐 상태 조회
  const { data: queueStatus } = useQuery({
    queryKey: ['/api/automation/queue-status'],
    refetchInterval: 2000, // 2초마다 갱신
  });

  // 필터 자동화 시작 (인수인계 문서 명세)
  const runAutomationMutation = useMutation({
    mutationFn: async (filters: string[] = ['전체']) => {
      const response = await apiRequest('POST', '/api/run', { 
        filters,
        options: {}
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsAutomationRunning(true);
      toast({
        title: "더망고 자동화 시작",
        description: "크롬 로그인, 썸네일 추출, AI 배경 제거 자동화가 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/automation'] });
    },
    onError: (error: Error) => {
      toast({
        title: "자동화 시작 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 완전 자동화 시작
  const startAutomationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/automation/start-full', {});
      return response.json();
    },
    onSuccess: (data: { task: AutomationTask }) => {
      setIsAutomationRunning(true);
      toast({
        title: "완전 자동화 시작",
        description: "망고몰 상품 수집 및 배경 제거 자동화가 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/automation'] });
    },
    onError: (error: Error) => {
      toast({
        title: "자동화 시작 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // WebSocket 메시지 처리
  if (lastMessage?.type === 'automation_progress') {
    if (lastMessage.progress === 100) {
      setIsAutomationRunning(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'warning': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'error': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>자동화 제어</CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isAutomationRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
              }`} />
              <span className="text-sm text-gray-600">
                {isAutomationRunning ? '실행중' : '대기중'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 더망고 필터 자동화 실행 (인수인계 문서 명세) */}
            <Button
              size="lg"
              className="h-auto p-6 flex flex-col items-center space-y-3 bg-green-600 hover:bg-green-700"
              onClick={() => runAutomationMutation.mutate(['전체'])}
              disabled={runAutomationMutation.isPending || isAutomationRunning}
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                {runAutomationMutation.isPending ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Zap className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="text-center">
                <div className="font-medium text-white">더망고 자동화 실행</div>
                <div className="text-sm text-white/80">로그인 + 추출 + AI 처리</div>
              </div>
            </Button>

            {/* 완전 자동화 시작 */}
            <Button
              size="lg"
              className="h-auto p-6 flex flex-col items-center space-y-3 bg-primary hover:bg-primary/90"
              onClick={() => startAutomationMutation.mutate()}
              disabled={startAutomationMutation.isPending || isAutomationRunning}
            >
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                {startAutomationMutation.isPending ? (
                  <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
                ) : (
                  <Play className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
              <div className="text-center">
                <div className="font-medium text-primary-foreground">완전 자동화 시작</div>
                <div className="text-sm text-primary-foreground/80">망고몰 수집부터 누끼 완료까지</div>
              </div>
            </Button>

            {/* 수동 이미지 업로드 */}
            <Button
              variant="outline"
              size="lg"
              className="h-auto p-6 flex flex-col items-center space-y-3"
              disabled
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900">이미지 직접 업로드</div>
                <div className="text-sm text-gray-500">수동으로 이미지 추가</div>
              </div>
            </Button>

            {/* 대기열 일괄 처리 */}
            <Button
              variant="outline"
              size="lg"
              className="h-auto p-6 flex flex-col items-center space-y-3 border-secondary text-secondary hover:bg-secondary/5"
              disabled={!queueStatus?.pendingItems || queueStatus.pendingItems === 0}
            >
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                <Layers className="w-6 h-6 text-secondary" />
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900">대기열 일괄 처리</div>
                <div className="text-sm text-gray-500">
                  {queueStatus?.pendingItems || 0}개 대기중
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 처리량</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '-' : stats?.totalProcessed?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-green-600 font-medium">+12.5%</span> 어제 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">대기열</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '-' : stats?.queueSize || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              예상 완료: <span className="font-medium">
                {queueStatus?.pendingItems > 0 ? '진행중' : '대기없음'}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">성공률</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '-' : `${stats?.successRate || 0}%`}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">지난 24시간 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">처리 속도</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '-' : stats?.processingSpeed || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">이미지/분</p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Processing Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Processing */}
        <Card>
          <CardHeader>
            <CardTitle>실시간 처리 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processingStatus?.currentProcessing ? (
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                    <img 
                      src={processingStatus.currentProcessing.originalUrl} 
                      alt="처리중인 이미지"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNmMtNi42MjcgMC0xMi02LjI3My0xMi0xNHM1LjM3My0xNCAxMi0xNGM2LjYyNyAwIDEyIDYuMjczIDEyIDE0cy01LjM3MyAxNC0xMiAxNHptMC0yNGMtNS41MjMgMC0xMCA0LjQ3Ny0xMCAxMHM0LjQ3NyAxMCAxMCAxMGM1LjUyMyAwIDEwLTQuNDc3IDEwLTEwcy00LjQ3Ny0xMC0xMC0xMHoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {processingStatus.currentProcessing.metadata?.productName || '처리중...'}
                    </p>
                    <p className="text-sm text-gray-500">배경 제거 진행중...</p>
                    <div className="mt-2">
                      <Progress value={65} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">65% 완료</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-green-600 font-medium">처리중</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>현재 처리중인 이미지가 없습니다</p>
                </div>
              )}

              {/* Queue Preview */}
              {processingStatus?.queueItems && processingStatus.queueItems.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-medium text-gray-900">대기열 미리보기</h4>
                  {processingStatus.queueItems.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={item.originalUrl} 
                          alt="대기중인 이미지"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAzMGMtNS41MjMgMC0xMC01LjIyNy0xMC0xMnM0LjQ3Ny0xMiAxMC0xMmM1LjUyMyAwIDEwIDUuMjI3IDEwIDEycy00LjQ3NyAxMi0xMCAxMnptMC0yMGMtNC40MTggMC04IDMuNTgyLTggOHMzLjU4MiA4IDggOGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOHoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg==';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {item.metadata?.productName || `이미지 ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">대기열 위치: {index + 1}번</p>
                      </div>
                      <Badge variant="secondary">대기중</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
                  전체 대기열 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chrome Automation */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Chrome className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Chrome 자동화</p>
                    <p className="text-sm text-gray-500">망고몰 상품 수집</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemStatus?.chrome || 'normal')}
                  <span className={`text-sm font-medium ${getStatusColor(systemStatus?.chrome || 'normal')}`}>
                    정상
                  </span>
                </div>
              </div>

              {/* Pixian AI */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Pixian AI</p>
                    <p className="text-sm text-gray-500">배경 제거 API</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemStatus?.pixian || 'normal')}
                  <span className={`text-sm font-medium ${getStatusColor(systemStatus?.pixian || 'normal')}`}>
                    연결됨
                  </span>
                </div>
              </div>

              {/* Database */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Database className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">PostgreSQL</p>
                    <p className="text-sm text-gray-500">데이터베이스</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemStatus?.database || 'normal')}
                  <span className={`text-sm font-medium ${getStatusColor(systemStatus?.database || 'normal')}`}>
                    연결됨
                  </span>
                </div>
              </div>

              {/* Storage */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <HardDrive className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">파일 저장소</p>
                    <p className="text-sm text-gray-500">이미지 저장</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemStatus?.storage || 'normal')}
                  <span className={`text-sm font-medium ${getStatusColor(systemStatus?.storage || 'normal')}`}>
                    정상
                  </span>
                </div>
              </div>
            </div>

            {/* System Resources */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">시스템 리소스</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">CPU 사용률</span>
                    <span className="font-medium">
                      {systemLoading ? '-' : `${systemStatus?.cpu || 0}%`}
                    </span>
                  </div>
                  <Progress value={systemStatus?.cpu || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">메모리 사용률</span>
                    <span className="font-medium">
                      {systemLoading ? '-' : `${systemStatus?.memory || 0}%`}
                    </span>
                  </div>
                  <Progress value={systemStatus?.memory || 0} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최근 활동 로그</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            전체 로그 보기
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-200">
            {processingStatus?.recentLogs && processingStatus.recentLogs.length > 0 ? (
              processingStatus.recentLogs.map((log) => (
                <div key={log.id} className="py-4 flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.level === 'success' ? 'bg-green-100' :
                      log.level === 'error' ? 'bg-red-100' :
                      log.level === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <CheckCircle className={`w-4 h-4 ${
                        log.level === 'success' ? 'text-green-600' :
                        log.level === 'error' ? 'text-red-600' :
                        log.level === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.message}</p>
                    <p className="text-xs text-gray-500">
                      {log.metadata?.processingTime && `처리 시간: ${log.metadata.processingTime}ms`}
                      {log.metadata?.quality && ` | 품질: ${log.metadata.quality}%`}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>최근 활동이 없습니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

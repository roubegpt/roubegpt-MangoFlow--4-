import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TestTube, Chrome, Brain, HardDrive, Settings as SettingsIcon } from 'lucide-react';
import {
  chromeSettingsSchema,
  pixianSettingsSchema,
  storageSettingsSchema,
  generalSettingsSchema,
  type ChromeSettings,
  type PixianSettings,
  type StorageSettings,
  type GeneralSettings
} from '@shared/schema';

export default function SettingsTabs() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('chrome');

  // 설정 조회
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Chrome 설정 폼
  const chromeForm = useForm<ChromeSettings>({
    resolver: zodResolver(chromeSettingsSchema),
    defaultValues: {
      url: 'https://www.mango.com/kr',
      category: '여성의류',
      limit: 50,
      headless: true,
      delay: 1000,
    },
  });

  // Pixian 설정 폼
  const pixianForm = useForm<PixianSettings>({
    resolver: zodResolver(pixianSettingsSchema),
    defaultValues: {
      apiKey: '',
      quality: 90,
      format: 'png',
      timeout: 30000,
    },
  });

  // 저장소 설정 폼
  const storageForm = useForm<StorageSettings>({
    resolver: zodResolver(storageSettingsSchema),
    defaultValues: {
      type: 'local',
      path: './uploads',
    },
  });

  // 일반 설정 폼
  const generalForm = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      autoStart: false,
      scheduleEnabled: false,
      scheduleTime: '09:00',
      maxConcurrent: 3,
      retryAttempts: 3,
    },
  });

  // 설정 데이터 로드 시 폼 업데이트
  useEffect(() => {
    if (settings) {
      if (settings.chrome) {
        chromeForm.reset(settings.chrome);
      }
      if (settings.pixian) {
        pixianForm.reset(settings.pixian);
      }
      if (settings.storage) {
        storageForm.reset(settings.storage);
      }
      if (settings.general) {
        generalForm.reset(settings.general);
      }
    }
  }, [settings, chromeForm, pixianForm, storageForm, generalForm]);

  // Chrome 설정 저장
  const chromeSettingsMutation = useMutation({
    mutationFn: async (data: ChromeSettings) => {
      await apiRequest('PUT', '/api/settings/chrome', data);
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "Chrome 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "설정 저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Chrome 연결 테스트
  const chromeTestMutation = useMutation({
    mutationFn: async (data: ChromeSettings) => {
      const response = await apiRequest('POST', '/api/settings/chrome/test', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "연결 성공" : "연결 실패",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  // Pixian 설정 저장
  const pixianSettingsMutation = useMutation({
    mutationFn: async (data: PixianSettings) => {
      await apiRequest('PUT', '/api/settings/pixian', data);
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "Pixian AI 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error) => {
      toast({
        title: "설정 저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pixian 연결 테스트
  const pixianTestMutation = useMutation({
    mutationFn: async (data: PixianSettings) => {
      const response = await apiRequest('POST', '/api/settings/pixian/test', data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "연결 성공" : "연결 실패",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  // 저장소 설정 저장
  const storageSettingsMutation = useMutation({
    mutationFn: async (data: StorageSettings) => {
      await apiRequest('PUT', '/api/settings/storage', data);
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "저장소 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  // 일반 설정 저장
  const generalSettingsMutation = useMutation({
    mutationFn: async (data: GeneralSettings) => {
      await apiRequest('PUT', '/api/settings/general', data);
    },
    onSuccess: () => {
      toast({
        title: "설정 저장 완료",
        description: "일반 설정이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="chrome" className="flex items-center gap-2">
          <Chrome className="w-4 h-4" />
          Chrome 자동화
        </TabsTrigger>
        <TabsTrigger value="pixian" className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Pixian AI
        </TabsTrigger>
        <TabsTrigger value="storage" className="flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          파일저장소
        </TabsTrigger>
        <TabsTrigger value="general" className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4" />
          일반설정
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chrome">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="w-5 h-5" />
              Chrome 자동화 설정
            </CardTitle>
            <CardDescription>
              망고몰 상품 이미지 수집을 위한 Chrome 브라우저 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={chromeForm.handleSubmit((data) => chromeSettingsMutation.mutate(data))}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="url">망고몰 URL</Label>
                  <Input
                    id="url"
                    type="url"
                    {...chromeForm.register('url')}
                    placeholder="https://www.mango.com/kr"
                  />
                  {chromeForm.formState.errors.url && (
                    <p className="text-sm text-red-500 mt-1">
                      {chromeForm.formState.errors.url.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">수집 카테고리</Label>
                  <Select
                    value={chromeForm.watch('category')}
                    onValueChange={(value) => chromeForm.setValue('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="여성의류">여성의류</SelectItem>
                      <SelectItem value="남성의류">남성의류</SelectItem>
                      <SelectItem value="액세서리">액세서리</SelectItem>
                      <SelectItem value="전체">전체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="limit">수집 제한 (개수)</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    max="500"
                    {...chromeForm.register('limit', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="delay">요청 간 딜레이 (밀리초)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="100"
                    max="5000"
                    {...chromeForm.register('delay', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="headless"
                    checked={chromeForm.watch('headless')}
                    onCheckedChange={(checked) => chromeForm.setValue('headless', checked)}
                  />
                  <Label htmlFor="headless">백그라운드에서 실행 (헤드리스 모드)</Label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => chromeTestMutation.mutate(chromeForm.getValues())}
                  disabled={chromeTestMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {chromeTestMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  연결 테스트
                </Button>
                <Button
                  type="submit"
                  disabled={chromeSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {chromeSettingsMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  설정 저장
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pixian">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Pixian AI 설정
            </CardTitle>
            <CardDescription>
              이미지 배경 제거를 위한 Pixian AI API 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={pixianForm.handleSubmit((data) => pixianSettingsMutation.mutate(data))}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="apiKey">API 키</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    {...pixianForm.register('apiKey')}
                    placeholder="px-..."
                  />
                  {pixianForm.formState.errors.apiKey && (
                    <p className="text-sm text-red-500 mt-1">
                      {pixianForm.formState.errors.apiKey.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quality">품질 (50-100)</Label>
                  <Input
                    id="quality"
                    type="number"
                    min="50"
                    max="100"
                    {...pixianForm.register('quality', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="format">출력 형식</Label>
                  <Select
                    value={pixianForm.watch('format')}
                    onValueChange={(value: 'png' | 'jpg') => pixianForm.setValue('format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeout">타임아웃 (밀리초)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="5000"
                    max="60000"
                    {...pixianForm.register('timeout', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pixianTestMutation.mutate(pixianForm.getValues())}
                  disabled={pixianTestMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {pixianTestMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  API 테스트
                </Button>
                <Button
                  type="submit"
                  disabled={pixianSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {pixianSettingsMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  설정 저장
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="storage">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              파일 저장소 설정
            </CardTitle>
            <CardDescription>
              처리된 이미지 파일을 저장할 위치 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={storageForm.handleSubmit((data) => storageSettingsMutation.mutate(data))}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="storageType">저장소 타입</Label>
                  <Select
                    value={storageForm.watch('type')}
                    onValueChange={(value: 'local' | 's3' | 'ftp') => storageForm.setValue('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">로컬 저장소</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="ftp">FTP 서버</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {storageForm.watch('type') === 'local' && (
                  <div>
                    <Label htmlFor="path">저장 경로</Label>
                    <Input
                      id="path"
                      {...storageForm.register('path')}
                      placeholder="./uploads"
                    />
                  </div>
                )}

                {storageForm.watch('type') === 's3' && (
                  <>
                    <div>
                      <Label htmlFor="s3Bucket">S3 버킷명</Label>
                      <Input
                        id="s3Bucket"
                        {...storageForm.register('s3Bucket')}
                        placeholder="my-bucket"
                      />
                    </div>
                    <div>
                      <Label htmlFor="s3Region">S3 리전</Label>
                      <Input
                        id="s3Region"
                        {...storageForm.register('s3Region')}
                        placeholder="ap-northeast-2"
                      />
                    </div>
                  </>
                )}

                {storageForm.watch('type') === 'ftp' && (
                  <>
                    <div>
                      <Label htmlFor="ftpHost">FTP 호스트</Label>
                      <Input
                        id="ftpHost"
                        {...storageForm.register('ftpHost')}
                        placeholder="ftp.example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ftpUser">FTP 사용자명</Label>
                      <Input
                        id="ftpUser"
                        {...storageForm.register('ftpUser')}
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ftpPassword">FTP 비밀번호</Label>
                      <Input
                        id="ftpPassword"
                        type="password"
                        {...storageForm.register('ftpPassword')}
                        placeholder="password"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={storageSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {storageSettingsMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  설정 저장
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              일반 설정
            </CardTitle>
            <CardDescription>
              자동화 시스템의 일반적인 동작 설정
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={generalForm.handleSubmit((data) => generalSettingsMutation.mutate(data))}>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoStart"
                    checked={generalForm.watch('autoStart')}
                    onCheckedChange={(checked) => generalForm.setValue('autoStart', checked)}
                  />
                  <Label htmlFor="autoStart">시스템 시작 시 자동 시작</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="scheduleEnabled"
                    checked={generalForm.watch('scheduleEnabled')}
                    onCheckedChange={(checked) => generalForm.setValue('scheduleEnabled', checked)}
                  />
                  <Label htmlFor="scheduleEnabled">일정 자동 수집 활성화</Label>
                </div>

                {generalForm.watch('scheduleEnabled') && (
                  <div>
                    <Label htmlFor="scheduleTime">자동 수집 시간</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      {...generalForm.register('scheduleTime')}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="maxConcurrent">최대 동시 처리 수 (1-10)</Label>
                  <Input
                    id="maxConcurrent"
                    type="number"
                    min="1"
                    max="10"
                    {...generalForm.register('maxConcurrent', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="retryAttempts">재시도 횟수 (1-5)</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    min="1"
                    max="5"
                    {...generalForm.register('retryAttempts', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  disabled={generalSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {generalSettingsMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  설정 저장
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

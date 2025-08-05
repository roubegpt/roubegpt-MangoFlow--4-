import SettingsTabs from '@/components/SettingsTabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
        </div>
        <p className="text-gray-600">더망고 자동화 시스템의 설정을 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>자동화 설정</CardTitle>
          <CardDescription>
            Chrome 자동화, Pixian AI, 파일 저장소 및 일반 설정을 구성하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsTabs />
        </CardContent>
      </Card>
    </div>
  );
}

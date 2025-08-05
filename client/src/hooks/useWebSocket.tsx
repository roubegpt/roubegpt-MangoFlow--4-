import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from './use-toast';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // 인증 메시지 전송
        ws.current?.send(JSON.stringify({ 
          type: 'auth',
          timestamp: Date.now()
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // 메시지 타입별 처리
          handleMessage(message);
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        
        // 자동 재연결
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`WebSocket 재연결 시도 ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
            connect();
          }, delay);
        } else {
          toast({
            title: "연결 오류",
            description: "서버와의 실시간 연결이 끊어졌습니다. 페이지를 새로고침해주세요.",
            variant: "destructive",
          });
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket 오류:', error);
      };

    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  }, [toast]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'automation_progress':
        // 자동화 진행 상황 업데이트
        if (message.progress === 100) {
          toast({
            title: "자동화 완료",
            description: `${message.message}`,
            variant: "default",
          });
        }
        break;

      case 'item_processing_completed':
        // 개별 이미지 처리 완료
        toast({
          title: "이미지 처리 완료",
          description: `${message.item.productName} 배경 제거가 완료되었습니다.`,
          variant: "default",
        });
        break;

      case 'item_processing_failed':
        // 이미지 처리 실패
        toast({
          title: "이미지 처리 실패",
          description: `${message.item.productName} 처리 중 오류가 발생했습니다.`,
          variant: "destructive",
        });
        break;

      case 'queue_updated':
        // 큐 상태 업데이트는 별도 토스트 없이 처리
        break;

      case 'auth_success':
        console.log('WebSocket 인증 성공:', message.clientId);
        break;

      default:
        console.log('알 수 없는 WebSocket 메시지:', message);
    }
  }, [toast]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket이 연결되지 않았습니다.');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

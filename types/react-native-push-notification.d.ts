declare module 'react-native-push-notification' {
  export interface ReceivedNotification {
    id?: string;
    message?: string;
    data?: any;
    userInfo?: Record<string, any>;
  }

  export interface NotificationChannel {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface LocalNotification {
    id?: string | number;
    channelId?: string;
    title?: string;
    message: string;
    playSound?: boolean;
    soundName?: string;
    importance?: 'default' | 'high' | 'low' | 'max' | 'min' | 'none';
    priority?: 'default' | 'high' | 'low' | 'max' | 'min';
    vibrate?: boolean;
    vibration?: number;
    ongoing?: boolean;
    alertAction?: string;
    category?: string;
    userInfo?: Record<string, any>;
    largeIcon?: string;
    smallIcon?: string;
    bigText?: string;
    subText?: string;
    bigPictureUrl?: string;
    color?: string;
    number?: number;
    actions?: string[];
    repeatType?: 'week' | 'day' | 'hour' | 'minute' | 'time';
    repeatTime?: number;
  }

  export default class PushNotification {
    static configure(options: {
      onRegister?: (token: {os: string; token: string}) => void;
      onNotification?: (notification: ReceivedNotification) => void;
      permissions?: {
        alert?: boolean;
        badge?: boolean;
        sound?: boolean;
      };
      popInitialNotification?: boolean;
      requestPermissions?: boolean;
    }): void;

    static localNotification(notification: LocalNotification): void;
    static createChannel(channel: NotificationChannel): void;
    static cancelAllLocalNotifications(): void;
    static removeAllDeliveredNotifications(): void;
  }
}

declare module '@react-native-community/push-notification-ios' {
  export default class PushNotificationIOS {
    static FetchResult: {
      NoData: string;
      NewData: string;
      Failed: string;
    };
  }
}

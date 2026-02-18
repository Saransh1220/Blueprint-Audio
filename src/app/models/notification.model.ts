export type NotificationType =
  | 'info'
  | 'success'
  | 'error'
  | 'processing_complete'
  | 'processing_failed';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: Date;
}

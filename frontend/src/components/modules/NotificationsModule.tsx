import React, { useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, RefreshCw, Trash2, Info, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useListNotifications, useMarkNotificationAsRead, useDeleteNotification } from '../../hooks/useQueries';
import type { Notification } from '../../backend';

function getNotificationIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('approved') || lowerTitle.includes('approval')) {
    return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
  }
  if (lowerTitle.includes('rejected') || lowerTitle.includes('reject')) {
    return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
  }
  if (lowerTitle.includes('alert') || lowerTitle.includes('warning')) {
    return <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  }
  return <Info className="w-5 h-5 text-primary flex-shrink-0" />;
}

function getNotificationBg(title: string, isRead: boolean) {
  if (isRead) return 'bg-background';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('approved') || lowerTitle.includes('approval')) {
    return 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500';
  }
  if (lowerTitle.includes('rejected') || lowerTitle.includes('reject')) {
    return 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500';
  }
  return 'bg-primary/5 border-l-4 border-l-primary';
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: bigint) => void;
  onDelete: (id: bigint) => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
}

function NotificationItem({ notification, onMarkRead, onDelete, isMarkingRead, isDeleting }: NotificationItemProps) {
  const timestampMs = Number(notification.timestamp) / 1_000_000;
  const timeAgo = formatDistanceToNow(new Date(timestampMs), { addSuffix: true });

  return (
    <div
      className={`p-4 rounded-lg transition-colors ${getNotificationBg(notification.title, notification.isRead)}`}
    >
      <div className="flex items-start gap-3">
        {getNotificationIcon(notification.title)}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm font-semibold ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                {notification.title}
              </p>
              <p className={`text-sm mt-0.5 ${notification.isRead ? 'text-muted-foreground' : 'text-foreground/80'}`}>
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onMarkRead(notification.notificationId)}
                  disabled={isMarkingRead}
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notification.notificationId)}
                disabled={isDeleting}
                title="Delete notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
        )}
      </div>
    </div>
  );
}

export default function NotificationsModule() {
  const { data: notifications = [], isLoading, error, refetch, isFetching } = useListNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const sortedNotifications = [...notifications].sort((a, b) => {
    // Unread first, then by timestamp descending
    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;
    return Number(b.timestamp - a.timestamp);
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (notificationId: bigint) => {
    const idStr = notificationId.toString();
    setMarkingIds(prev => new Set(prev).add(idStr));
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(idStr);
        return next;
      });
    }
  };

  const handleDelete = async (notificationId: bigint) => {
    const idStr = notificationId.toString();
    setDeletingIds(prev => new Set(prev).add(idStr));
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(idStr);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    await Promise.all(unreadNotifications.map(n => markAsReadMutation.mutateAsync(n.notificationId)));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to load notifications. Please try again.</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {sortedNotifications.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <BellOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be notified about account approvals, rejections, and other important updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                All Notifications
                <Badge variant="secondary" className="ml-2 text-xs">
                  {notifications.length}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <div className="p-4 space-y-2">
                {sortedNotifications.map((notification, index) => (
                  <React.Fragment key={notification.notificationId.toString()}>
                    <NotificationItem
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onDelete={handleDelete}
                      isMarkingRead={markingIds.has(notification.notificationId.toString())}
                      isDeleting={deletingIds.has(notification.notificationId.toString())}
                    />
                    {index < sortedNotifications.length - 1 && (
                      <Separator className="my-1 opacity-50" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

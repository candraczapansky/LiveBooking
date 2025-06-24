import { useState } from "react";
import { Bell, X, AlertCircle, Calendar, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

type NotificationType = "appointment" | "payment" | "system" | "client";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "appointment":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "payment":
      return <CreditCard className="h-4 w-4 text-green-500" />;
    case "client":
      return <Users className="h-4 w-4 text-purple-500" />;
    case "system":
    default:
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
  }
};

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "appointment",
      title: "Upcoming Appointment",
      message: "Jane Doe has an appointment in 30 minutes",
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
      actionUrl: "/appointments"
    },
    {
      id: "2",
      type: "client",
      title: "New Client Registration",
      message: "Mike Johnson just registered as a new client",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      actionUrl: "/clients"
    },
    {
      id: "3",
      type: "payment",
      title: "Payment Received",
      message: "Payment of $120.00 received from Sarah Wilson",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
      actionUrl: "/reports"
    },
    {
      id: "4",
      type: "system",
      title: "System Update",
      message: "BeautyBook has been updated with new features",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className={`p-3 cursor-pointer flex flex-col items-start space-y-1 ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                }}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp)} ago
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = "/notifications"}
              >
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
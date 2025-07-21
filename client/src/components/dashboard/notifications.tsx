import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, CalendarX, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: number;
  type: string;
  title: string;
  description: string;
  userId?: number;
  relatedId?: number;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
};

const getNotificationIcon = (type: string) => {
  switch(type) {
    case 'appointment_booked':
      return <Calendar className="text-primary" />;
    case 'appointment_cancelled':
      return <CalendarX className="text-red-600" />;
    case 'payment_received':
      return <DollarSign className="text-green-600" />;
    case 'new_membership':
      return <CreditCard className="text-pink-600" />;
    default:
      return <Calendar className="text-gray-600" />;
  }
};



const NotificationItem = ({ notification }: { notification: Notification }) => {
  const timeAgo = notification.createdAt 
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
    : 'Unknown time';
  
  return (
    <li className="py-3 sm:py-4">
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center">
            <div className="h-4 w-4 sm:h-5 sm:w-5">
              {getNotificationIcon(notification.type)}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-tight">{notification.title}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{notification.description}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
        </div>
      </div>
    </li>
  );
};

const RecentNotifications = () => {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications?limit=5');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-4 sm:py-5">
          <CardTitle className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-4 sm:py-5">
        <CardTitle className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="flow-root">
          <ul className="-my-3 sm:-my-4 divide-y divide-gray-200 dark:divide-gray-700">
            {(notifications as any[]).map((notification: any) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 px-3 py-3 sm:px-4 sm:py-4">
        <a href="#" className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          View all notifications <span aria-hidden="true">→</span>
        </a>
      </CardFooter>
    </Card>
  );
};

export default RecentNotifications;

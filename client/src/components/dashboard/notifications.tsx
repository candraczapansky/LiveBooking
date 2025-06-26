import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, CalendarX, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  type: 'appointment_booked' | 'appointment_cancelled' | 'payment_received' | 'new_membership';
  title: string;
  description: string;
  timeAgo: string;
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{notification.timeAgo}</p>
        </div>
      </div>
    </li>
  );
};

const RecentNotifications = () => {
  // In a real app, these would be fetched from an API
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'appointment_booked',
      title: 'New appointment booked',
      description: 'Emma Wilson booked Haircut & Style for tomorrow',
      timeAgo: '15 minutes ago'
    },
    {
      id: 2,
      type: 'appointment_cancelled',
      title: 'Appointment cancelled',
      description: 'James Wilson cancelled his 4:00 PM appointment',
      timeAgo: '35 minutes ago'
    },
    {
      id: 3,
      type: 'payment_received',
      title: 'Payment received',
      description: '$85 received from Michael Brown',
      timeAgo: '1 hour ago'
    },
    {
      id: 4,
      type: 'new_membership',
      title: 'New membership',
      description: 'Olivia Martinez purchased Premium membership',
      timeAgo: '2 hours ago'
    }
  ];

  return (
    <Card>
      <CardHeader className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-4 sm:py-5">
        <CardTitle className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="flow-root">
          <ul className="-my-3 sm:-my-4 divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map(notification => (
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

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDuration } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  client: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  service: {
    id: number;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    user: {
      id: number;
      firstName?: string;
      lastName?: string;
    };
  };
};

type AppointmentCalendarProps = {
  appointments: Appointment[];
  isLoading: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointmentId: number) => void;
};

const statusColors = {
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  completed: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
};

const getAppointmentBadgeColor = (appointment: Appointment) => {
  // Always use status color regardless of payment status
  return statusColors[appointment.status];
};

const getAppointmentBadgeText = (appointment: Appointment) => {
  // Show status, with payment indicator if paid
  const status = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
  const isPaid = appointment.paymentStatus === 'paid';
  return isPaid ? `${status} (Paid)` : status;
};

const AppointmentCalendar = ({
  appointments,
  isLoading,
  selectedDate,
  onDateChange,
  onAppointmentClick,
}: AppointmentCalendarProps) => {
  const [sortBy, setSortBy] = useState<string>("time"); // time, client, service
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedAppointments = [...appointments].sort((a, b) => {
    if (sortBy === "time") {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    } else if (sortBy === "client") {
      const aName = `${a.client.firstName} ${a.client.lastName}`.toLowerCase();
      const bName = `${b.client.firstName} ${b.client.lastName}`.toLowerCase();
      return sortDirection === "asc"
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    } else if (sortBy === "service") {
      return sortDirection === "asc"
        ? a.service.name.localeCompare(b.service.name)
        : b.service.name.localeCompare(a.service.name);
    }
    return 0;
  });

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const today = new Date();
  const navigateToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    onDateChange(prevDay);
  };

  const navigateToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(nextDay);
  };

  const formatDateHeader = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Widget */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Select a date to view appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            className="rounded-md border"
          />
          <div className="mt-4 space-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-100 border-2 border-green-500 mr-2"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-100 border-2 border-red-500 mr-2"></div>
              <span className="text-sm">Fully Booked</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-100 border-2 border-yellow-500 mr-2"></div>
              <span className="text-sm">Limited Availability</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Schedule */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointments</CardTitle>
            <CardDescription>
              Viewing schedule for {formatDateHeader(selectedDate)}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={navigateToPreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onDateChange(today)}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={navigateToNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : sortedAppointments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-2">No appointments for this date</div>
              <Button
                variant="outline"
                onClick={() => onAppointmentClick(-1)}
              >
                + Add Appointment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] cursor-pointer" onClick={() => toggleSort("time")}>
                      <div className="flex items-center">
                        Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("client")}>
                      <div className="flex items-center">
                        Client
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("service")}>
                      <div className="flex items-center">
                        Service
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAppointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      onClick={() => onAppointmentClick(appointment.id)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <TableCell className="font-medium">
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDuration(appointment.service.duration)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="" alt={`${appointment.client.firstName} ${appointment.client.lastName}`} />
                            <AvatarFallback>
                              {getInitials(appointment.client.firstName, appointment.client.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {appointment.client.firstName} {appointment.client.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {appointment.client.phone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.service.name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={getAppointmentBadgeColor(appointment)}
                          variant="outline"
                        >
                          {getAppointmentBadgeText(appointment)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="link" 
                          className="text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appointment.id);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentCalendar;
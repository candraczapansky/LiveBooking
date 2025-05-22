import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime, getInitials } from "@/lib/utils";

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
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

const getStatusBadgeStyle = (status: string) => {
  switch(status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const AppointmentsTable = () => {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: () => {
      // This would fetch from the API in a real app
      // For demo purposes, we'll return mock data
      return Promise.resolve([
        {
          id: 1,
          startTime: "2023-07-15T09:00:00Z",
          endTime: "2023-07-15T09:45:00Z",
          status: 'confirmed',
          client: {
            id: 101,
            email: "emma.w@example.com",
            firstName: "Emma",
            lastName: "Wilson"
          },
          service: {
            id: 201,
            name: "Haircut & Style",
            duration: 45,
            price: 65
          },
          staff: {
            user: {
              id: 301,
              firstName: "Jessica",
              lastName: "Taylor"
            }
          }
        },
        {
          id: 2,
          startTime: "2023-07-15T10:00:00Z",
          endTime: "2023-07-15T10:30:00Z",
          status: 'confirmed',
          client: {
            id: 102,
            email: "michael.b@example.com",
            firstName: "Michael",
            lastName: "Brown"
          },
          service: {
            id: 202,
            name: "Men's Haircut",
            duration: 30,
            price: 45
          },
          staff: {
            user: {
              id: 302,
              firstName: "David",
              lastName: "Miller"
            }
          }
        },
        {
          id: 3,
          startTime: "2023-07-15T11:15:00Z",
          endTime: "2023-07-15T13:15:00Z",
          status: 'pending',
          client: {
            id: 103,
            email: "sophia.c@example.com",
            firstName: "Sophia",
            lastName: "Chen"
          },
          service: {
            id: 203,
            name: "Full Highlights",
            duration: 120,
            price: 150
          },
          staff: {
            user: {
              id: 301,
              firstName: "Jessica",
              lastName: "Taylor"
            }
          }
        },
        {
          id: 4,
          startTime: "2023-07-15T14:30:00Z",
          endTime: "2023-07-15T15:30:00Z",
          status: 'confirmed',
          client: {
            id: 104,
            email: "olivia.m@example.com",
            firstName: "Olivia",
            lastName: "Martinez"
          },
          service: {
            id: 204,
            name: "Deep Conditioning Treatment",
            duration: 60,
            price: 75
          },
          staff: {
            user: {
              id: 303,
              firstName: "Amanda",
              lastName: "Lee"
            }
          }
        },
        {
          id: 5,
          startTime: "2023-07-15T16:00:00Z",
          endTime: "2023-07-15T16:45:00Z",
          status: 'cancelled',
          client: {
            id: 105,
            email: "james.w@example.com",
            firstName: "James",
            lastName: "Wilson"
          },
          service: {
            id: 205,
            name: "Beard Trim & Hot Shave",
            duration: 45,
            price: 55
          },
          staff: {
            user: {
              id: 302,
              firstName: "David",
              lastName: "Miller"
            }
          }
        }
      ]) as Appointment[];
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading appointments...</div>;
  }

  const totalAppointments = appointments?.length || 0;
  const totalPages = Math.ceil(totalAppointments / pageSize);
  const paginatedAppointments = appointments?.slice((page - 1) * pageSize, page * pageSize);

  const handlePrevPage = () => {
    setPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Today's Schedule</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAppointments?.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell className="whitespace-nowrap">
                  {formatTime(appointment.startTime)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-4">
                      <AvatarImage 
                        src={`https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120`} 
                        alt={`${appointment.client.firstName} ${appointment.client.lastName}`}
                      />
                      <AvatarFallback>{getInitials(appointment.client.firstName, appointment.client.lastName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {appointment.client.firstName} {appointment.client.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.client.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{appointment.service.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.service.duration} min</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {appointment.staff.user.firstName} {appointment.staff.user.lastName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadgeStyle(appointment.status)}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="link" className="text-primary">Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(page * pageSize, totalAppointments)}
              </span>{" "}
              of <span className="font-medium">{totalAppointments}</span> appointments
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(i + 1)}
                  className="relative inline-flex items-center px-4 py-2 border"
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsTable;

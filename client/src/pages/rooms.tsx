import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Layout handled globally by MainLayout

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RoomForm } from "@/components/rooms/room-form";

export default function RoomsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const response = await fetch("/api/rooms");
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
  });

  // Fetch locations to display human-readable location names
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/locations");
      return response.json();
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete room",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingRoom(null);
    setIsFormOpen(true);
  };

  const handleDelete = (roomId: number) => {
    if (confirm("Are you sure you want to delete this room?")) {
      deleteRoomMutation.mutate(roomId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">
            Manage treatment rooms and service areas
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Rooms & Service Areas
          </CardTitle>
          <CardDescription>
            Configure rooms where services are performed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rooms && rooms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room: any) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {room.location?.name 
                        || room.locationName 
                        || ((locations as any[])?.find((l: any) => l.id === room.locationId)?.name)
                        || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {room.capacity ? `${room.capacity} person${room.capacity > 1 ? 's' : ''}` : 'Not specified'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.isActive ? "default" : "secondary"}>
                        {room.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(room)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(room.id)}
                          disabled={deleteRoomMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first room or service area
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <RoomForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        room={editingRoom}
      />
    </div>
  );
}
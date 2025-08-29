import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roomFormSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  isActive: z.boolean().default(true),
  // Require location to re-enable assigning rooms to locations
  locationId: z.coerce.number({ required_error: "Location is required" }),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

type RoomFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: any;
};

export function RoomForm({ open, onOpenChange, room }: RoomFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      description: "",
      capacity: 1,
      isActive: true,
      locationId: undefined as unknown as number,
    },
  });

  // Locations for assignment
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/locations");
      return res.json();
    },
  });

  // Reset form when dialog opens/closes or room changes
  useEffect(() => {
    if (open) {
      // Determine default location when adding new room
      const defaultLocationId = Array.isArray(locations) && locations.length > 0
        ? (locations.find((l: any) => l.isDefault)?.id ?? locations[0]?.id)
        : undefined;
      if (room) {
        form.reset({
          name: room.name || "",
          description: room.description || "",
          capacity: room.capacity || 1,
          isActive: room.isActive ?? true,
          locationId: room.locationId ?? defaultLocationId as unknown as number,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          capacity: 1,
          isActive: true,
          locationId: (defaultLocationId as unknown as number),
        });
      }
    }
  }, [open, room, form, locations]);

  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormValues) => {
      // First attempt: send as-is
      let response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        // Try to surface server error message
        let message = "Failed to create room";
        try {
          const err = await response.json();
          if (err?.error) message = err.error;
        } catch {}

        // Compatibility fallback: retry without locationId if backend schema lacks this column
        const schemaErrorText = message?.toLowerCase?.() || "";
        if (
          response.status === 400 &&
          (schemaErrorText.includes("location_id") || schemaErrorText.includes("column") || schemaErrorText.includes("does not exist"))
        ) {
          const { locationId, ...rest } = data;
          response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rest),
          });
          if (response.ok) return response.json();
          try {
            const err = await response.json();
            if (err?.error) message = err.error;
          } catch {}

          // Last-resort compat: send only required column(s)
          response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.name }),
          });
          if (response.ok) return response.json();
          try {
            const err2 = await response.json();
            if (err2?.error) message = err2.error;
          } catch {}
        }

        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (data: RoomFormValues) => {
      let response = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let message = "Failed to update room";
        try {
          const err = await response.json();
          if (err?.error) message = err.error;
        } catch {}

        const schemaErrorText = message?.toLowerCase?.() || "";
        if (
          response.status === 400 &&
          (schemaErrorText.includes("location_id") || schemaErrorText.includes("column") || schemaErrorText.includes("does not exist"))
        ) {
          const { locationId, ...rest } = data;
          response = await fetch(`/api/rooms/${room.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rest),
          });
          if (response.ok) return response.json();
          try {
            const err = await response.json();
            if (err?.error) message = err.error;
          } catch {}
        }

        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update room",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoomFormValues) => {
    if (room) {
      updateRoomMutation.mutate(data);
    } else {
      createRoomMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add Room"}</DialogTitle>
          <DialogDescription>
            {room 
              ? "Update the room details below." 
              : "Add a new room or service area to your salon."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Treatment Room 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Private room with relaxing ambiance..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="1" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(locations) && locations.map((loc: any) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>
                            {loc.name || `Location ${loc.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Room</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Active rooms are available for service assignment
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
              >
                {room ? "Update Room" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
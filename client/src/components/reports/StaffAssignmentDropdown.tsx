import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

type StaffAssignmentDropdownProps = {
  saleId: number;
  onAssign: () => void;
};

export default function StaffAssignmentDropdown({ saleId, onAssign }: StaffAssignmentDropdownProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch all staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['/api/staff'],
    refetchOnWindowFocus: false,
  });

  // Handle staff assignment
  const assignStaff = async () => {
    if (!selectedStaff) return;
    
    setIsAssigning(true);
    try {
      const selectedStaffObj = staffMembers.find(
        (s: any) => `${s.id}` === selectedStaff
      );
      
      if (!selectedStaffObj) {
        console.error('Selected staff not found');
        return;
      }
      
      const staffName = selectedStaffObj.user?.firstName && selectedStaffObj.user?.lastName ? 
        `${selectedStaffObj.user.firstName} ${selectedStaffObj.user.lastName}`.trim() :
        'Unknown Staff';
      
      await fetch(`/api/sales-history/${saleId}/assign-staff`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          staffId: selectedStaffObj.id,
          staffName,
        }),
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        onAssign();
      }, 1000);
    } catch (error) {
      console.error('Error assigning staff:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return <span className="text-gray-500">Loading...</span>;
  }

  if (isSuccess) {
    return (
      <div className="flex items-center text-green-600 dark:text-green-400">
        <CheckCircle size={16} className="mr-1" />
        <span>Assigned</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedStaff} onValueChange={setSelectedStaff}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Assign staff..." />
        </SelectTrigger>
        <SelectContent>
          {staffMembers.map((staff: any) => (
            <SelectItem 
              key={staff.id} 
              value={`${staff.id}`}
              className="text-xs"
            >
              {staff.user?.firstName} {staff.user?.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={assignStaff}
        disabled={!selectedStaff || isAssigning}
        className="h-8 px-2"
      >
        {isAssigning ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          'Assign'
        )}
      </Button>
    </div>
  );
}

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  Star,
  Users,
  Mail,
  Phone
} from "lucide-react";

interface ClientSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    status: string;
    communicationPreferences: string[];
    appointmentStatus: string;
    spendingRange: string;
    lastVisit: string;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  totalClients: number;
  filteredClients: number;
}

export default function ClientSearchFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
  totalClients,
  filteredClients
}: ClientSearchFiltersProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleCommunicationPreferenceChange = (preference: string, checked: boolean) => {
    const currentPreferences = filters.communicationPreferences || [];
    let newPreferences;
    
    if (checked) {
      newPreferences = [...currentPreferences, preference];
    } else {
      newPreferences = currentPreferences.filter(p => p !== preference);
    }
    
    handleFilterChange('communicationPreferences', newPreferences);
  };

  const hasActiveFilters = () => {
    return (
      filters.status !== 'all' ||
      filters.communicationPreferences.length > 0 ||
      filters.appointmentStatus !== 'all' ||
      filters.spendingRange !== 'all' ||
      filters.lastVisit !== 'all'
    );
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.communicationPreferences.length > 0) count += filters.communicationPreferences.length;
    if (filters.appointmentStatus !== 'all') count++;
    if (filters.spendingRange !== 'all') count++;
    if (filters.lastVisit !== 'all') count++;
    return count;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters() && (
              <Badge variant="secondary" className="text-xs">
                {getFilterCount()} active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="h-8 px-2"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredClients} of {totalClients} clients
          {searchQuery && (
            <span className="ml-2">
              for "{searchQuery}"
            </span>
          )}
        </div>
      </CardHeader>

      {/* Advanced Filters */}
      {isFiltersExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    <SelectItem value="active">Active clients</SelectItem>
                    <SelectItem value="inactive">Inactive clients</SelectItem>
                    <SelectItem value="new">New clients (30 days)</SelectItem>
                    <SelectItem value="returning">Returning clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Appointment Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Appointment Status</label>
                <Select
                  value={filters.appointmentStatus}
                  onValueChange={(value) => handleFilterChange('appointmentStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All appointments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All appointments</SelectItem>
                    <SelectItem value="upcoming">Upcoming appointments</SelectItem>
                    <SelectItem value="completed">Completed appointments</SelectItem>
                    <SelectItem value="cancelled">Cancelled appointments</SelectItem>
                    <SelectItem value="no-appointments">No appointments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spending Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Spending Range</label>
                <Select
                  value={filters.spendingRange}
                  onValueChange={(value) => handleFilterChange('spendingRange', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All spending" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All spending</SelectItem>
                    <SelectItem value="high">High spenders ($500+)</SelectItem>
                    <SelectItem value="medium">Medium spenders ($100-$500)</SelectItem>
                    <SelectItem value="low">Low spenders ($0-$100)</SelectItem>
                    <SelectItem value="none">No spending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Last Visit */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Visit</label>
                <Select
                  value={filters.lastVisit}
                  onValueChange={(value) => handleFilterChange('lastVisit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                    <SelectItem value="1year">Last year</SelectItem>
                    <SelectItem value="never">Never visited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Communication Preferences */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Communication Preferences</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-account"
                    checked={filters.communicationPreferences.includes('email-account')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('email-account', checked as boolean)
                    }
                  />
                  <label htmlFor="email-account" className="text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email Account
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-reminders"
                    checked={filters.communicationPreferences.includes('email-reminders')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('email-reminders', checked as boolean)
                    }
                  />
                  <label htmlFor="email-reminders" className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Email Reminders
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-promotions"
                    checked={filters.communicationPreferences.includes('email-promotions')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('email-promotions', checked as boolean)
                    }
                  />
                  <label htmlFor="email-promotions" className="text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Email Promotions
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms-account"
                    checked={filters.communicationPreferences.includes('sms-account')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('sms-account', checked as boolean)
                    }
                  />
                  <label htmlFor="sms-account" className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    SMS Account
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms-reminders"
                    checked={filters.communicationPreferences.includes('sms-reminders')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('sms-reminders', checked as boolean)
                    }
                  />
                  <label htmlFor="sms-reminders" className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    SMS Reminders
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms-promotions"
                    checked={filters.communicationPreferences.includes('sms-promotions')}
                    onCheckedChange={(checked) => 
                      handleCommunicationPreferenceChange('sms-promotions', checked as boolean)
                    }
                  />
                  <label htmlFor="sms-promotions" className="text-sm flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    SMS Promotions
                  </label>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {hasActiveFilters() && (
                  <span>
                    {getFilterCount()} filter{getFilterCount() !== 1 ? 's' : ''} active
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {hasActiveFilters() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFiltersExpanded(false)}
                  className="h-8"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 
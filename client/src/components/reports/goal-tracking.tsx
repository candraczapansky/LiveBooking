import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Edit, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface BusinessGoal {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'clients' | 'retention' | 'no_shows' | 'custom';
  target: number;
  current: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: 'on_track' | 'behind' | 'ahead' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface GoalTrackingProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
}

const GoalTracking: React.FC<GoalTrackingProps> = ({
  timePeriod,
  customStartDate,
  customEndDate
}) => {
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<BusinessGoal | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'revenue' as const,
    target: 0,
    unit: '',
    startDate: '',
    endDate: '',
    priority: 'medium' as const
  });

  // Mock goals data - in a real app, this would come from an API
  const [goals, setGoals] = useState<BusinessGoal[]>([
    {
      id: '1',
      title: 'Increase Monthly Revenue',
      description: 'Boost monthly revenue by 15% through service upselling and new client acquisition',
      category: 'revenue',
      target: 50000,
      current: 42000,
      unit: 'USD',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'on_track',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Reduce No-Show Rate',
      description: 'Decrease no-show rate to under 5% through better reminder systems',
      category: 'no_shows',
      target: 5,
      current: 8,
      unit: '%',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      status: 'behind',
      priority: 'high'
    },
    {
      id: '3',
      title: 'Client Retention Rate',
      description: 'Maintain client retention rate above 80%',
      category: 'retention',
      target: 80,
      current: 85,
      unit: '%',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'ahead',
      priority: 'medium'
    }
  ]);

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'ahead':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'on_track':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'behind':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'ahead':
        return <TrendingUp className="h-4 w-4" />;
      case 'on_track':
        return <Target className="h-4 w-4" />;
      case 'behind':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.target || !newGoal.startDate || !newGoal.endDate) {
      return;
    }

    const goal: BusinessGoal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      target: newGoal.target,
      current: 0,
      unit: newGoal.unit,
      startDate: newGoal.startDate,
      endDate: newGoal.endDate,
      status: 'on_track',
      priority: newGoal.priority
    };

    setGoals([...goals, goal]);
    setNewGoal({
      title: '',
      description: '',
      category: 'revenue',
      target: 0,
      unit: '',
      startDate: '',
      endDate: '',
      priority: 'medium'
    });
    setIsAddGoalOpen(false);
  };

  const handleUpdateGoal = (id: string, updates: Partial<BusinessGoal>) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return <TrendingUp className="h-4 w-4" />;
      case 'clients':
        return <Target className="h-4 w-4" />;
      case 'retention':
        return <CheckCircle className="h-4 w-4" />;
      case 'no_shows':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Goal Tracking</CardTitle>
              <CardDescription>
                Set and monitor business goals with real-time progress tracking
              </CardDescription>
            </div>
          </div>
          <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Business Goal</DialogTitle>
                <DialogDescription>
                  Set a new goal to track your business performance
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="e.g., Increase Monthly Revenue"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newGoal.category} 
                      onValueChange={(value: any) => setNewGoal({...newGoal, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="clients">Clients</SelectItem>
                        <SelectItem value="retention">Retention</SelectItem>
                        <SelectItem value="no_shows">No-Shows</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newGoal.priority} 
                      onValueChange={(value: any) => setNewGoal({...newGoal, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="target">Target Value</Label>
                    <Input
                      id="target"
                      type="number"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({...newGoal, target: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                      placeholder="USD, %, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newGoal.startDate}
                      onChange={(e) => setNewGoal({...newGoal, startDate: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newGoal.endDate}
                      onChange={(e) => setNewGoal({...newGoal, endDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGoal}>Add Goal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <div className="text-lg font-medium mb-2">No Goals Set</div>
              <div className="text-sm">
                Create your first business goal to start tracking progress
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Goals Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-2xl font-bold text-blue-600">
                  {goals.length}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Total Goals
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-2xl font-bold text-green-600">
                  {goals.filter(g => g.status === 'completed' || g.status === 'ahead').length}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  On Track
                </div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-2xl font-bold text-yellow-600">
                  {goals.filter(g => g.status === 'on_track').length}
                </div>
                <div className="text-sm text-yellow-600 font-medium">
                  In Progress
                </div>
              </div>
              
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-2xl font-bold text-red-600">
                  {goals.filter(g => g.status === 'behind').length}
                </div>
                <div className="text-sm text-red-600 font-medium">
                  Behind
                </div>
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-4">
              {goals.map((goal) => (
                <div 
                  key={goal.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(goal.category)}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {goal.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(goal.status)}`}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(goal.status)}
                            {goal.status.replace('_', ' ')}
                          </div>
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(goal.priority)}`}
                        >
                          {goal.priority} priority
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {goal.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Progress: {goal.current} / {goal.target} {goal.unit}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {calculateProgress(goal.current, goal.target).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={calculateProgress(goal.current, goal.target)} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingGoal(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalTracking; 
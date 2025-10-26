import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDebouncedToast } from "@/hooks/use-debounced-toast";
import { User, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: any;
  canEdit: boolean;
}

export function TaskCard({ task, canEdit }: TaskCardProps) {
  const { user, role } = useAuth();
  const { showDebouncedToast, showImmediateToast } = useDebouncedToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      showDebouncedToast("Task updated successfully");
      setIsEditing(null);
    },
    onError: (error: any) => {
      console.error("Task update error:", error);
      const errorMessage = error?.response?.data?.message || "Failed to update task";
      showImmediateToast(errorMessage, "destructive");
    },
  });

  const handleFieldUpdate = (field: string, value: any) => {
    updateTaskMutation.mutate({ id: task.id, updates: { [field]: value } });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(null);
    }
    if (e.key === "Escape") {
      setIsEditing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-primary text-primary-foreground";
      case "In-Progress": return "bg-accent text-accent-foreground";
      case "Blocked": return "bg-destructive text-destructive-foreground";
      case "Done": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "border-l-destructive";
      case "Medium": return "border-l-accent";
      case "Low": return "border-l-secondary";
      default: return "border-l-muted";
    }
  };

  const canEditField = (field: string) => {
    if (role === "Admin" || role === "Superadmin") return true;
    if (role === "Coordinator") return canEdit;
    if (role === "Member") {
      // Members can only edit status, notes, and priority on any task within their team
      const isSameTeam = !!task.team?.id; // task includes team in TaskWithDetails
      return (field === "status" || field === "notes" || field === "priority") && isSameTeam;
    }
    return false;
  };

  return (
    <Card 
      className={cn(
        "task-card transition-all duration-200 border-l-4",
        getPriorityColor(task.priority)
      )}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {isEditing === "title" && canEditField("title") ? (
              <Input
                defaultValue={task.title}
                onBlur={(e) => handleFieldUpdate("title", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "title")}
                className="mb-1 font-medium"
                autoFocus
                data-testid="task-title-input"
              />
            ) : (
              <h3 
                className="font-medium text-foreground mb-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
                onClick={() => canEditField("title") && setIsEditing("title")}
                data-testid="task-title"
              >
                {task.title}
              </h3>
            )}
            
            {isEditing === "notes" && canEditField("notes") ? (
              <Textarea
                defaultValue={task.notes || ""}
                onBlur={(e) => handleFieldUpdate("notes", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "notes")}
                className="text-sm resize-none"
                rows={2}
                autoFocus
                data-testid="task-notes-input"
              />
            ) : (
              <p 
                className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 min-h-[20px]"
                onClick={() => canEditField("notes") && setIsEditing("notes")}
                data-testid="task-notes"
              >
                {task.notes || "No description"}
              </p>
            )}
          </div>
          
          {isEditing === "status" && canEditField("status") ? (
            <Select defaultValue={task.status} onValueChange={(value) => handleFieldUpdate("status", value)}>
              <SelectTrigger className="ml-3 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In-Progress">In Progress</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
                <SelectItem value="Canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge
              className={cn("ml-3 cursor-pointer", getStatusColor(task.status))}
              onClick={() => canEditField("status") && setIsEditing("status")}
              data-testid="task-status"
            >
              {task.status}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-muted-foreground">
              <User className="w-4 h-4 mr-1" />
              <span data-testid="task-assignee">
                {task.responsibleMember?.user?.displayName || "Unassigned"}
              </span>
            </div>
            {task.dueDate && (
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1" />
                <span data-testid="task-due-date">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            )}
          </div>
{isEditing === "priority" && canEditField("priority") ? (
  <Select defaultValue={task.priority} onValueChange={(value) => handleFieldUpdate("priority", value)}>
    <SelectTrigger className="w-auto">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Low">Low</SelectItem>
      <SelectItem value="Medium">Medium</SelectItem>
      <SelectItem value="High">High</SelectItem>
    </SelectContent>
  </Select>
) : (
  <Badge 
    variant="outline" 
    className={cn(
      task.priority === "High" && "text-destructive border-destructive cursor-pointer",
      task.priority === "Medium" && "text-accent border-accent cursor-pointer",
      task.priority === "Low" && "text-secondary border-secondary cursor-pointer",
      "hover:bg-muted/50"
    )} 
    onClick={() => canEditField("priority") && setIsEditing("priority")}
    data-testid="task-priority"
  >
    {task.priority}
  </Badge>
)}
        </div>
      </CardContent>
    </Card>
  );
}

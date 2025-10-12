import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title too long"),
  notes: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  status: z.enum(["Open", "In-Progress", "Blocked"]).default("Open"),
  responsibleMemberId: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedTeam, teams } = useTeam();
  const { role } = useAuth();
  const [chosenTeamId, setChosenTeamId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: "Medium",
      status: "Open",
      dueDate: new Date().toLocaleDateString('en-CA'),
    },
  });

  const effectiveTeamId = (role === "Admin" || role === "Superadmin")
    ? (chosenTeamId || selectedTeam?.id || null)
    : (selectedTeam?.id || null);

  const { data: team } = useQuery({
    queryKey: ["/api/teams", effectiveTeamId],
    queryFn: async () => {
      if (!effectiveTeamId) return null;
      const response = await fetch("/api/teams", { credentials: "include" });
      if (response.ok) {
        const teams = await response.json();
        return teams.find((t: any) => t.id === effectiveTeamId) || null;
      }
      return null;
    },
    enabled: !!effectiveTeamId && open,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskForm) => {
      if (!effectiveTeamId) {
        throw new Error("No team selected");
      }
      
      const taskData = {
        ...data,
        teamId: effectiveTeamId,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        responsibleMemberId: data.responsibleMemberId === "unassigned" ? null : data.responsibleMemberId,
      };
      
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created successfully" });
      reset();
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateTaskForm) => {
    if (!effectiveTeamId) {
      toast({ title: "Please select a team first", variant: "destructive" });
      return;
    }
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="add-task-modal">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for the selected team. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {(role === "Admin" || role === "Superadmin") && (
            <div>
              <Label htmlFor="team">Team</Label>
              <Select 
                onValueChange={(value) => setChosenTeamId(value)}
                defaultValue={selectedTeam?.id}
              >
                <SelectTrigger className="mt-1" data-testid="select-task-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enter task title..."
              className="mt-1"
              data-testid="input-task-title"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add task details..."
              rows={3}
              className="mt-1 resize-none"
              data-testid="input-task-notes"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                defaultValue="Medium" 
                onValueChange={(value: "Low" | "Medium" | "High") => setValue("priority", value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                defaultValue="Open" 
                onValueChange={(value: "Open" | "In-Progress" | "Blocked") => setValue("status", value)}
              >
                <SelectTrigger className="mt-1" data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In-Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="responsibleMember">Responsible Member</Label>
            <Select onValueChange={(value) => setValue("responsibleMemberId", value === "unassigned" ? undefined : value)}>
              <SelectTrigger className="mt-1" data-testid="select-task-assignee">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {team?.members?.map((member: any) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.user.displayName || member.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              className="mt-1"
              data-testid="input-task-due-date"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              data-testid="button-cancel-task"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createTaskMutation.isPending}
              data-testid="button-create-task"
            >
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

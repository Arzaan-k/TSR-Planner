import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(50, "Name too long"),
  defaultVenue: z.string().optional(),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

interface AddTeamModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTeamModal({ open, onClose }: AddTeamModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await apiRequest("POST", "/api/teams", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      reset();
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create team", variant: "destructive" });
    },
  });

  const onSubmit = (data: CreateTeamForm) => {
    // Convert empty string to undefined for optional fields
    const teamData = {
      ...data,
      defaultVenue: data.defaultVenue?.trim() || undefined,
    };
    createTeamMutation.mutate(teamData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="add-team-modal">
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize tasks and manage members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter team name..."
              className="mt-1"
              data-testid="input-team-name"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="defaultVenue">Default Venue</Label>
            <Input
              id="defaultVenue"
              {...register("defaultVenue")}
              placeholder="Enter default meeting venue..."
              className="mt-1"
              data-testid="input-team-venue"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              data-testid="button-cancel-team"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createTeamMutation.isPending}
              data-testid="button-create-team"
            >
              Create Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

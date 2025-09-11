import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SnapshotCardProps {
  snapshot: any;
}

export function SnapshotCard({ snapshot }: SnapshotCardProps) {
  const task = snapshot.payload;
  const isDeleted = snapshot.changeType === "Deleted";

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case "Added": return "bg-secondary text-secondary-foreground border-l-secondary";
      case "Edited": return "bg-accent text-accent-foreground border-l-accent";
      case "Deleted": return "bg-destructive/10 text-destructive border-l-destructive";
      default: return "bg-muted text-muted-foreground border-l-muted";
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "Added": return "+";
      case "Edited": return "~";
      case "Deleted": return "×";
      default: return "·";
    }
  };

  return (
    <Card 
      className={cn(
        "border-l-4 transition-all duration-200",
        isDeleted ? "opacity-75 bg-muted/50" : "bg-card",
        getChangeTypeColor(snapshot.changeType).split(" ").slice(2).join(" ")
      )}
      data-testid={`snapshot-card-${snapshot.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <Badge 
            className={cn(
              "text-xs",
              getChangeTypeColor(snapshot.changeType).split(" ").slice(0, 2).join(" ")
            )}
            data-testid="snapshot-change-type"
          >
            <span className="mr-1">{getChangeTypeIcon(snapshot.changeType)}</span>
            {snapshot.changeType}
          </Badge>
          <span className="text-xs text-muted-foreground" data-testid="snapshot-time">
            {new Date(snapshot.recordedAt).toLocaleTimeString('en-US', { 
              hour: 'numeric',
              minute: '2-digit',
              hour12: true 
            })}
          </span>
        </div>
        
        <h4 className={cn(
          "font-medium mb-1",
          isDeleted ? "text-muted-foreground line-through" : "text-foreground"
        )} data-testid="snapshot-task-title">
          {task.title}
        </h4>
        
        {task.notes && (
          <p className={cn(
            "text-sm mb-2",
            isDeleted ? "text-muted-foreground line-through" : "text-muted-foreground"
          )} data-testid="snapshot-task-notes">
            {task.notes}
          </p>
        )}

        {snapshot.changeType === "Edited" && (
          <div className="text-sm space-y-1" data-testid="snapshot-changes">
            <div className="text-accent">
              Status updated to: {task.status}
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
          <span data-testid="snapshot-assignee">
            Assignee: {task.responsibleMember?.user?.displayName || "Unassigned"}
          </span>
          <span data-testid="snapshot-priority">
            Priority: {task.priority}
          </span>
          <span data-testid="snapshot-status">
            Status: {task.status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

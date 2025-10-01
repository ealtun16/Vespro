import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Chat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
          Ask the Agent
        </h1>
        <p className="text-muted-foreground" data-testid="page-subtitle">
          Chat with the AI agent for tank cost analysis insights and recommendations
        </p>
      </div>

      <Card data-testid="card-chat-interface">
        <CardHeader>
          <CardTitle>Agent Chat</CardTitle>
          <CardDescription>
            Ask questions about tank specifications, cost estimates, and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Chat interface implementation coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

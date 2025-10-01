import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TankAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
          Tank Analysis
        </h1>
        <p className="text-muted-foreground" data-testid="page-subtitle">
          Form-based tank specification input with preliminary price computation
        </p>
      </div>

      <Card data-testid="card-tank-analysis-form">
        <CardHeader>
          <CardTitle>Tank Specification Form</CardTitle>
          <CardDescription>
            Enter tank specifications to get a preliminary cost estimate and agent analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Form implementation coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

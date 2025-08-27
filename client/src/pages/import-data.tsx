import FileUpload from "@/components/upload/file-upload";
import { Card, CardContent } from "@/components/ui/card";

export default function ImportData() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Import Data
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          Import Excel files containing tank cost analysis data
        </p>
      </div>

      <FileUpload />

      <Card className="card-shadow">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4" data-testid="text-import-guidelines">
            Import Guidelines
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-2">Required Excel Columns:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Report ID - Unique identifier for the cost analysis</li>
                <li>Tank Type - Storage Tank, Pressure Vessel, or Heat Exchanger</li>
                <li>Tank Name - Descriptive name for the tank</li>
                <li>Capacity - Tank capacity in liters</li>
                <li>Height - Tank height in millimeters</li>
                <li>Material Cost - Cost of materials in USD</li>
                <li>Labor Cost - Labor costs in USD</li>
                <li>Overhead Cost - Overhead costs in USD</li>
                <li>Total Cost - Total project cost in USD</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Optional Columns:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Material - Steel grade or material type</li>
                <li>Thickness - Wall thickness in millimeters</li>
                <li>Pressure - Operating pressure in bar</li>
                <li>Temperature - Operating temperature in Celsius</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">File Requirements:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maximum file size: 10MB</li>
                <li>Supported formats: .xlsx, .xls</li>
                <li>Data should start from row 2 (row 1 for headers)</li>
                <li>All required columns must be present</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileSpreadsheet, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Reports() {
  const [reportType, setReportType] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export/excel');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cost-analysis-export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Report has been exported to Excel",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export report to Excel",
        variant: "destructive",
      });
    }
  };

  const generateCustomReport = () => {
    toast({
      title: "Feature coming soon",
      description: "Custom report generation will be available soon",
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
          Reports
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-page-description">
          Generate and export cost analysis reports
        </p>
      </div>

      {/* Report Generation Options */}
      <Card className="card-shadow mb-8">
        <CardHeader>
          <CardTitle data-testid="text-report-generation">Report Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Report Type
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Analyses</SelectItem>
                  <SelectItem value="storage">Storage Tanks Only</SelectItem>
                  <SelectItem value="pressure">Pressure Vessels Only</SelectItem>
                  <SelectItem value="heat">Heat Exchangers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date From
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="button-date-from">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date To
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="button-date-to">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button onClick={handleExport} data-testid="button-export-excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button variant="outline" onClick={generateCustomReport} data-testid="button-generate-custom">
              <Download className="mr-2 h-4 w-4" />
              Generate Custom Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                  <FileSpreadsheet className="text-primary-foreground h-4 w-4" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Available Reports</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-available-reports">
                  {stats?.totalReports || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
                  <Download className="text-accent-foreground h-4 w-4" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Exports This Month</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-exports">
                  {stats?.monthlyReports || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-success rounded-md flex items-center justify-center">
                  <CalendarIcon className="text-white h-4 w-4" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Last Export</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-last-export">
                  Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center">
                  <FileSpreadsheet className="text-secondary-foreground h-4 w-4" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Report Types</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-report-types">
                  3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Export Templates */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle data-testid="text-quick-exports">Quick Export Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground mb-2" data-testid="text-template-summary">
                  Cost Summary Report
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Summary of all cost analyses with totals and averages
                </p>
                <Button size="sm" onClick={handleExport} data-testid="button-export-summary">
                  <Download className="mr-2 h-3 w-3" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground mb-2" data-testid="text-template-detailed">
                  Detailed Cost Breakdown
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed breakdown including materials and labor costs
                </p>
                <Button size="sm" onClick={handleExport} data-testid="button-export-detailed">
                  <Download className="mr-2 h-3 w-3" />
                  Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground mb-2" data-testid="text-template-monthly">
                  Monthly Report
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cost analyses from the current month
                </p>
                <Button size="sm" onClick={handleExport} data-testid="button-export-monthly">
                  <Download className="mr-2 h-3 w-3" />
                  Export
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

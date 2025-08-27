import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CostAnalysisTableProps {
  data?: any;
  loading?: boolean;
  showPagination?: boolean;
}

export default function CostAnalysisTable({ 
  data: propData, 
  loading: propLoading, 
  showPagination = true 
}: CostAnalysisTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tankType, setTankType] = useState('all');
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/cost-analyses", { page: currentPage, limit: 10, search, tankType }],
    enabled: !propData,
  });

  const tableData = propData || data;
  const loading = propLoading || isLoading;

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
        description: "Cost analysis data has been exported to Excel",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data to Excel",
        variant: "destructive",
      });
    }
  };

  const viewReport = (reportId: string) => {
    toast({
      title: "View Report",
      description: `Opening report ${reportId}`,
    });
  };

  const editReport = (reportId: string) => {
    toast({
      title: "Edit Report",
      description: `Editing report ${reportId}`,
    });
  };

  const downloadReport = (reportId: string) => {
    toast({
      title: "Download Report",
      description: `Downloading report ${reportId}`,
    });
  };

  if (loading) {
    return (
      <Card className="card-shadow overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const analyses = tableData?.analyses || [];
  const total = tableData?.total || 0;

  return (
    <>
      {/* Filters and Search */}
      {showPagination && (
        <Card className="card-shadow mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-foreground" data-testid="text-table-title">
                Cost Analysis Reports
              </h2>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Input
                    placeholder="Search reports..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                <Select value={tankType} onValueChange={setTankType}>
                  <SelectTrigger className="w-40" data-testid="select-tank-type">
                    <SelectValue placeholder="Tank Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tank Types</SelectItem>
                    <SelectItem value="Storage Tank">Storage Tank</SelectItem>
                    <SelectItem value="Pressure Vessel">Pressure Vessel</SelectItem>
                    <SelectItem value="Heat Exchanger">Heat Exchanger</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleExport}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-export"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card className="card-shadow overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="text-muted-foreground font-medium">Report ID</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Tank Type</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Dimensions</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Material Cost</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Total Cost</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Created Date</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No cost analysis reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  analyses.map((analysis: any) => (
                    <TableRow 
                      key={analysis.id} 
                      className="table-row cursor-pointer"
                      data-testid={`row-analysis-${analysis.id}`}
                    >
                      <TableCell className="font-medium text-primary" data-testid={`text-report-id-${analysis.id}`}>
                        {analysis.reportId}
                      </TableCell>
                      <TableCell data-testid={`text-tank-type-${analysis.id}`}>
                        {analysis.tankType || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-dimensions-${analysis.id}`}>
                        {analysis.capacity && analysis.height 
                          ? `${analysis.capacity}L x ${analysis.height}H`
                          : 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-material-cost-${analysis.id}`}>
                        ${parseFloat(analysis.materialCost || '0').toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`text-total-cost-${analysis.id}`}>
                        ${parseFloat(analysis.totalCost || '0').toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-created-date-${analysis.id}`}>
                        {analysis.analysisDate ? new Date(analysis.analysisDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => viewReport(analysis.reportId)}
                            className="text-primary hover:text-primary/80"
                            data-testid={`button-view-${analysis.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => editReport(analysis.reportId)}
                            className="text-accent hover:text-accent/80"
                            data-testid={`button-edit-${analysis.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => downloadReport(analysis.reportId)}
                            className="text-success hover:text-success/80"
                            data-testid={`button-download-${analysis.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {showPagination && (
            <div className="bg-card border-t border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Showing</span>
                  <span className="mx-1 font-medium text-foreground" data-testid="text-pagination-start">
                    {((currentPage - 1) * 10) + 1}
                  </span>
                  <span>to</span>
                  <span className="mx-1 font-medium text-foreground" data-testid="text-pagination-end">
                    {Math.min(currentPage * 10, total)}
                  </span>
                  <span>of</span>
                  <span className="mx-1 font-medium text-foreground" data-testid="text-pagination-total">
                    {total}
                  </span>
                  <span>results</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, Math.ceil(total / 10)) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(Math.ceil(total / 10), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(total / 10)}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

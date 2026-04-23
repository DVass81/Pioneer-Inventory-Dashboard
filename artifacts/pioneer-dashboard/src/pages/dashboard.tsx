import { Link } from "wouter";
import { useGetInventorySummary, useGetRecentReleaseRequests } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Layers, Clock, ArrowRight } from "lucide-react";
import { formatCategory, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetInventorySummary();
  const { data: recentRequests, isLoading: isLoadingRequests } = useGetRecentReleaseRequests({ limit: 5 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="dashboard-title">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Inventory snapshot and recent activity.</p>
        </div>
        <Link href="/requests/new">
          <Button data-testid="button-new-request">New Release Request</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-items">{summary?.totalItems || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive" data-testid="stat-low-stock">{summary?.lowStockCount || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sheets (Mica)</CardTitle>
            <Layers className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="stat-total-sheets">{summary?.totalSheets || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-amber-600" data-testid="stat-pending-requests">{summary?.pendingRequests || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="lg:col-span-2 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Inventory Breakdown</CardTitle>
            <CardDescription>Items and stock levels by category</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingSummary ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {summary.categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{formatCategory(cat.category)}</span>
                      <span className="text-sm text-muted-foreground">{cat.count} unique products</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{cat.totalStock}</div>
                      <div className="text-xs text-muted-foreground">total stock</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">
                No inventory data available
              </div>
            )}
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
             <Link href="/inventory">
              <Button variant="outline" className="w-full" data-testid="link-view-inventory">
                View Full Inventory
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Requests */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Latest release activity</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingRequests ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentRequests && recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((req) => (
                  <Link key={req.id} href={`/requests`}>
                    <div className="flex flex-col p-3 rounded-md border border-border/40 hover:border-primary/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate pr-2 group-hover:text-primary transition-colors" data-testid={`recent-req-user-${req.id}`}>
                          {req.requestedBy}
                        </span>
                        <Badge 
                          variant={
                            req.status === 'pending' ? 'secondary' :
                            req.status === 'approved' ? 'default' :
                            req.status === 'completed' ? 'outline' : 'destructive'
                          }
                          className="text-[10px] px-1.5 py-0 h-5"
                          data-testid={`recent-req-status-${req.id}`}
                        >
                          {req.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-1">
                        {req.quantity} {req.inventoryItem?.unit || 'units'} of {req.inventoryItem?.product || 'Item'}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 text-right mt-auto">
                        {formatDate(req.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md">
                No recent requests
              </div>
            )}
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            <Link href="/requests">
              <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center gap-1" data-testid="link-view-requests">
                View All Requests <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

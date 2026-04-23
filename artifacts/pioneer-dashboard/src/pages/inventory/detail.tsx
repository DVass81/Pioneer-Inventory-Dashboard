import { useGetInventoryItem, getGetInventoryItemQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, Package, Scale, Ruler, History, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mocking release requests for an item since we don't have a specific endpoint for it
// In a real app, this would use an API hook like useListReleaseRequests({ inventoryItemId: id })
// Using the generic list and filtering client-side for demonstration
import { useListReleaseRequests } from "@workspace/api-client-react";

export default function InventoryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: item, isLoading: isLoadingItem } = useGetInventoryItem(id, { 
    query: { enabled: !!id, queryKey: getGetInventoryItemQueryKey(id) } 
  });

  const { data: allRequests, isLoading: isLoadingRequests } = useListReleaseRequests();
  
  const itemRequests = allRequests?.filter(req => req.inventoryItemId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  if (isLoadingItem) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-foreground">Item not found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The inventory item you're looking for doesn't exist.</p>
        <Link href="/inventory">
          <Button variant="outline">Return to Inventory</Button>
        </Link>
      </div>
    );
  }

  const isLowStock = item.lowStockThreshold !== null && item.currentStock <= item.lowStockThreshold;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="detail-title">{item.product}</h1>
            {isLowStock && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Low Stock
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="outline">{formatCategory(item.category)}</Badge>
            <span>Added {formatDate(item.createdAt)}</span>
          </p>
        </div>
        <div className="ml-auto">
          <Link href={`/requests/new?itemId=${item.id}`}>
            <Button data-testid="btn-create-request">Create Request</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4" /> Current Stock
                </dt>
                <dd className="mt-1 text-3xl font-semibold text-foreground flex items-baseline gap-2">
                  <span className={isLowStock ? "text-destructive" : ""} data-testid="detail-stock">
                    {item.currentStock}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                </dd>
              </div>
              
              {item.lowStockThreshold !== null && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" /> Low Stock Threshold
                  </dt>
                  <dd className="mt-1 text-xl font-medium text-foreground flex items-baseline gap-2">
                    {item.lowStockThreshold}
                    <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                  </dd>
                </div>
              )}

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Ruler className="w-4 h-4" /> Dimensions
                </dt>
                <dd className="mt-1 text-lg font-medium text-foreground">
                  {item.thickness ? `${item.thickness}` : ''}
                  {item.thickness && item.sheetSize ? ' × ' : ''}
                  {item.sheetSize ? `${item.sheetSize}` : 'N/A'}
                </dd>
              </div>

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4" /> Weight Per {item.unit === 'sheets' ? 'Sheet' : 'Unit'}
                </dt>
                <dd className="mt-1 text-lg font-medium text-foreground">
                  {item.weightPerSheet !== null ? `${item.weightPerSheet} lbs` : 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-sm flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5" /> Release History
            </CardTitle>
            <CardDescription>Past requests for this item</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            {isLoadingRequests ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : itemRequests.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {itemRequests.map((req) => (
                  <div key={req.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-border bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-foreground">{req.requestedBy}</div>
                        <Badge 
                          variant={
                            req.status === 'pending' ? 'secondary' :
                            req.status === 'approved' ? 'default' :
                            req.status === 'completed' ? 'outline' : 'destructive'
                          }
                          className="text-[10px] px-1 h-4 uppercase"
                        >
                          {req.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-primary">-{req.quantity} {item.unit}</div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(req.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md bg-muted/20">
                No history found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

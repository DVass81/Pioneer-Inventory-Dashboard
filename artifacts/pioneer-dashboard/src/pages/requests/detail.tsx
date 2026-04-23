import { useParams, Link } from "wouter";
import { useGetReleaseRequest } from "@workspace/api-client-react";
import { useUpdateRequestStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Package, Hash, FileText, CheckCircle, XCircle, PackageCheck, RotateCcw } from "lucide-react";
import { formatCategory, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
    pending: "secondary",
    approved: "default",
    completed: "outline",
    rejected: "destructive",
  };
  return (
    <Badge variant={variants[status] ?? "secondary"} className="uppercase text-xs px-2 py-1">
      {status}
    </Badge>
  );
}

function StatusActions({ id, status }: { id: number; status: string }) {
  const update = useUpdateRequestStatus();
  const { toast } = useToast();

  const handle = (newStatus: string) => {
    update.mutate({ id, status: newStatus as any }, {
      onSuccess: () => toast({ title: `Request marked as ${newStatus}` }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  };

  const isPending = update.isPending;

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50" disabled={isPending} onClick={() => handle("approved")}>
          <CheckCircle className="h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-red-700 border-red-300 hover:bg-red-50" disabled={isPending} onClick={() => handle("rejected")}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50" disabled={isPending} onClick={() => handle("completed")}>
          <PackageCheck className="h-4 w-4" /> Mark Complete
        </Button>
        <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
          <RotateCcw className="h-4 w-4" /> Undo Approval
        </Button>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
        <RotateCcw className="h-4 w-4" /> Reopen
      </Button>
    );
  }
  return null;
}

export default function RequestDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: request, isLoading } = useGetReleaseRequest(id, {
    query: { enabled: !!id },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Request not found</h2>
        <p className="text-muted-foreground mt-2 mb-6">This release request doesn't exist.</p>
        <Link href="/requests">
          <Button variant="outline">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const item = request.inventoryItem;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/requests">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Request #{request.id}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-muted-foreground mt-1">Submitted {formatDate(request.createdAt)}</p>
        </div>
        <div className="ml-auto">
          <StatusActions id={request.id} status={request.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-5">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Requested By</dt>
                  <dd className="font-medium">{request.requestedBy}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Email</dt>
                  <dd className="font-medium">
                    <a href={`mailto:${request.requestedByEmail}`} className="text-primary hover:underline">
                      {request.requestedByEmail}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Product</dt>
                  {item ? (
                    <dd>
                      <Link href={`/inventory/${request.inventoryItemId}`} className="font-medium text-primary hover:underline">
                        {item.product}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">{formatCategory(item.category)}</div>
                    </dd>
                  ) : (
                    <dd className="font-medium text-muted-foreground">Item #{request.inventoryItemId}</dd>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5">Quantity Requested</dt>
                  <dd className="font-semibold text-lg">
                    {request.quantity} <span className="text-sm font-normal text-muted-foreground">{item?.unit || "units"}</span>
                  </dd>
                </div>
              </div>
              {request.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5">Notes</dt>
                    <dd className="text-sm whitespace-pre-wrap">{request.notes}</dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">Request submitted</div>
                  <div className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</div>
                </div>
              </div>
              {request.updatedAt !== request.createdAt && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                  <div>
                    <div className="text-sm font-medium">
                      Status changed to <StatusBadge status={request.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDate(request.updatedAt)}</div>
                  </div>
                </div>
              )}
            </div>

            {item && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2">Current inventory after all requests</div>
                <div className="text-2xl font-bold">
                  {item.currentStock}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                </div>
                {item.lowStockThreshold != null && item.currentStock <= item.lowStockThreshold && (
                  <Badge variant="destructive" className="mt-2 flex items-center gap-1 w-fit">
                    <AlertTriangle className="w-3 h-3" /> Low Stock
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

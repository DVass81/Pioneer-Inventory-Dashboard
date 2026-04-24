import { useParams, Link } from "wouter";
import { useGetReleaseRequest } from "@workspace/api-client-react";
import { useUpdateRequestStatus, useResendRequestEmail } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Package, Hash, FileText, CheckCircle, XCircle, PackageCheck, RotateCcw, Send, AlertTriangle } from "lucide-react";
import { formatCategory, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [rejectOpen, setRejectOpen] = useState(false);

  const handle = (newStatus: string) => {
    update.mutate({ id, status: newStatus as any }, {
      onSuccess: () => toast({ title: `Request marked as ${newStatus}` }),
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  };

  const isPending = update.isPending;

  return (
    <>
      {status === "pending" && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50" disabled={isPending} onClick={() => handle("approved")}>
            <CheckCircle className="h-4 w-4" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-red-700 border-red-300 hover:bg-red-50" disabled={isPending} onClick={() => setRejectOpen(true)}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      )}
      {status === "approved" && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50" disabled={isPending} onClick={() => handle("completed")}>
            <PackageCheck className="h-4 w-4" /> Mark Complete
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
            <RotateCcw className="h-4 w-4" /> Undo Approval
          </Button>
        </div>
      )}
      {status === "rejected" && (
        <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
          <RotateCcw className="h-4 w-4" /> Reopen
        </Button>
      )}

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the request as rejected. No inventory will be affected. You can reopen it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handle("rejected")}
            >
              Yes, Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function RequestDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const { data: request, isLoading } = useGetReleaseRequest(id, {
    query: { enabled: !!id },
  });

  const resend = useResendRequestEmail();

  function handleResend() {
    resend.mutate(id, {
      onSuccess: () => toast({ title: "Notification email resent to Pioneer team" }),
      onError: () => toast({ title: "Could not resend email — SMTP may not be configured", variant: "destructive" }),
    });
  }

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
  const isLowStock = item?.lowStockThreshold != null && item.currentStock <= item.lowStockThreshold;

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
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResend} disabled={resend.isPending}>
            <Send className="h-4 w-4" />
            {resend.isPending ? "Sending..." : "Resend to Pioneer"}
          </Button>
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
                    <div className="text-sm font-medium flex items-center gap-2">
                      Status changed to <StatusBadge status={request.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDate(request.updatedAt)}</div>
                  </div>
                </div>
              )}
            </div>

            {item && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2">Current inventory</div>
                <div className="text-2xl font-bold">
                  {item.currentStock}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                </div>
                {isLowStock && (
                  <div className="mt-2 flex items-center gap-1.5 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" /> Below low stock threshold
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

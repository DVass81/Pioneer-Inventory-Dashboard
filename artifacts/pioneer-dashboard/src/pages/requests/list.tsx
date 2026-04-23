import { useListReleaseRequests, ListReleaseRequestsStatus, useUpdateRequestStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Filter, CheckCircle, XCircle, PackageCheck, RotateCcw, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50" disabled={isPending} onClick={() => handle("approved")}>
          <CheckCircle className="h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50" disabled={isPending} onClick={() => handle("rejected")}>
          <XCircle className="h-3 w-3" /> Reject
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50" disabled={isPending} onClick={() => handle("completed")}>
          <PackageCheck className="h-3 w-3" /> Complete
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
          <RotateCcw className="h-3 w-3" /> Undo
        </Button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" disabled={isPending} onClick={() => handle("pending")}>
        <RotateCcw className="h-3 w-3" /> Reopen
      </Button>
    );
  }

  return null;
}

export default function RequestsList() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: requests, isLoading } = useListReleaseRequests(
    statusFilter !== "all" ? { status: statusFilter as ListReleaseRequestsStatus } : undefined
  );

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (!search.trim()) return requests;
    const query = search.toLowerCase();
    return requests.filter(req =>
      req.requestedBy.toLowerCase().includes(query) ||
      (req.inventoryItem?.product && req.inventoryItem.product.toLowerCase().includes(query)) ||
      (req.notes && req.notes.toLowerCase().includes(query))
    );
  }, [requests, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="requests-title">Release Requests</h1>
          <p className="text-muted-foreground mt-1">Manage and track material withdrawals.</p>
        </div>
        <Link href="/requests/new">
          <Button className="flex items-center gap-2" data-testid="btn-new-request">
            <PlusCircle className="w-4 h-4" /> New Request
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>History of all material release requests.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search requester or product..."
                  className="pl-8 bg-muted/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-requests"
                />
              </div>
              <div className="w-full sm:w-40 flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-muted/50" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-[48px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium" data-testid={`req-name-${req.id}`}>{req.requestedBy}</div>
                        <div className="text-xs text-muted-foreground">{req.requestedByEmail}</div>
                      </TableCell>
                      <TableCell>
                        {req.inventoryItem ? (
                          <div>
                            <Link href={`/inventory/${req.inventoryItemId}`} className="font-medium text-primary hover:underline">
                              {req.inventoryItem.product}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {formatCategory(req.inventoryItem.category)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Item #{req.inventoryItemId}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold" data-testid={`req-qty-${req.id}`}>{req.quantity}</span>
                        <span className="text-xs text-muted-foreground ml-1">{req.inventoryItem?.unit || 'units'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'pending' ? 'secondary' :
                            req.status === 'approved' ? 'default' :
                            req.status === 'completed' ? 'outline' : 'destructive'
                          }
                          className="uppercase text-[10px]"
                          data-testid={`req-status-${req.id}`}
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusActions id={req.id} status={req.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/requests/${req.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No release requests found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

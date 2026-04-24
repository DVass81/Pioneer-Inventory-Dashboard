import { useGetInventoryItem, getGetInventoryItemQueryKey } from "@workspace/api-client-react";
import { useAdjustStock, useUpdateThreshold, useStockMovements } from "@workspace/api-client-react";
import { InventoryItemDialog } from "@/components/inventory-item-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, Package, Scale, Ruler, History, TrendingUp, TrendingDown, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function reasonLabel(reason: string) {
  switch (reason) {
    case "release_completed": return "Release completed";
    case "release_undone": return "Release undone";
    case "manual_receipt": return "Stock received";
    case "manual_deduction": return "Manual deduction";
    default: return reason;
  }
}

export default function InventoryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const { data: item, isLoading: isLoadingItem } = useGetInventoryItem(id, {
    query: { enabled: !!id, queryKey: getGetInventoryItemQueryKey(id) }
  });

  const { data: movements, isLoading: isLoadingMovements } = useStockMovements(id);

  const adjustStock = useAdjustStock();
  const updateThreshold = useUpdateThreshold();

  // Edit item dialog state
  const [editOpen, setEditOpen] = useState(false);

  // Adjust stock dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustMode, setAdjustMode] = useState<"add" | "remove">("add");

  // Threshold edit state
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("");

  function handleAdjustSubmit() {
    const raw = parseInt(adjustAmount, 10);
    if (isNaN(raw) || raw <= 0) {
      toast({ title: "Enter a valid positive quantity", variant: "destructive" });
      return;
    }
    const amount = adjustMode === "add" ? raw : -raw;
    adjustStock.mutate({ id, amount, notes: adjustNotes || undefined }, {
      onSuccess: () => {
        toast({ title: `Stock ${adjustMode === "add" ? "added" : "removed"} successfully` });
        setAdjustOpen(false);
        setAdjustAmount("");
        setAdjustNotes("");
      },
      onError: (err: any) => {
        toast({ title: err?.message || "Failed to adjust stock", variant: "destructive" });
      },
    });
  }

  function startEditThreshold() {
    setThresholdValue(item?.lowStockThreshold != null ? String(item.lowStockThreshold) : "");
    setEditingThreshold(true);
  }

  function saveThreshold() {
    const val = thresholdValue.trim() === "" ? null : parseInt(thresholdValue, 10);
    if (val !== null && (isNaN(val) || val < 0)) {
      toast({ title: "Enter a valid non-negative number", variant: "destructive" });
      return;
    }
    updateThreshold.mutate({ id, threshold: val }, {
      onSuccess: () => {
        toast({ title: "Low stock threshold updated" });
        setEditingThreshold(false);
      },
      onError: () => {
        toast({ title: "Failed to update threshold", variant: "destructive" });
      },
    });
  }

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
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Badge variant="outline">{formatCategory(item.category)}</Badge>
            <span>Added {formatDate(item.createdAt)}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit Item
          </Button>
          <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Adjust Stock</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock — {item.product}</DialogTitle>
                <DialogDescription>
                  Record a shipment received or a manual correction. Current stock: <strong>{item.currentStock} {item.unit}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex gap-2">
                  <Button
                    variant={adjustMode === "add" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAdjustMode("add")}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" /> Add Stock
                  </Button>
                  <Button
                    variant={adjustMode === "remove" ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={() => setAdjustMode("remove")}
                  >
                    <TrendingDown className="w-4 h-4 mr-2" /> Remove Stock
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adjust-amount">Quantity ({item.unit})</Label>
                  <Input
                    id="adjust-amount"
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adjust-notes">Notes (optional)</Label>
                  <Textarea
                    id="adjust-notes"
                    placeholder="e.g. Received from supplier on 4/23/2026"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                <Button
                  variant={adjustMode === "add" ? "default" : "destructive"}
                  onClick={handleAdjustSubmit}
                  disabled={adjustStock.isPending}
                >
                  {adjustStock.isPending ? "Saving..." : adjustMode === "add" ? "Add Stock" : "Remove Stock"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Low Stock Threshold
                </dt>
                <dd className="mt-1">
                  {editingThreshold ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-28"
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        placeholder="None"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={saveThreshold} disabled={updateThreshold.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingThreshold(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 group">
                      <span className="text-xl font-medium text-foreground">
                        {item.lowStockThreshold != null ? item.lowStockThreshold : <span className="text-muted-foreground text-sm">Not set</span>}
                      </span>
                      {item.lowStockThreshold != null && (
                        <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                      )}
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={startEditThreshold}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </dd>
              </div>

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
              <History className="w-5 h-5" /> Stock History
            </CardTitle>
            <CardDescription>All movements for this item</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            {isLoadingMovements ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : movements && movements.length > 0 ? (
              <div className="space-y-2">
                {movements.map((m) => {
                  const isPositive = m.changeAmount > 0;
                  return (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-md border border-border/40 bg-muted/20">
                      <div className={`mt-0.5 rounded-full p-1 ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold text-sm ${isPositive ? "text-green-700" : "text-red-700"}`}>
                            {isPositive ? "+" : ""}{m.changeAmount}
                          </span>
                          <span className="text-xs text-muted-foreground">{m.stockAfter} after</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{reasonLabel(m.reason)}</div>
                        {m.notes && <div className="text-xs text-muted-foreground truncate mt-0.5">{m.notes}</div>}
                        <div className="text-[10px] text-muted-foreground/70 mt-1">{formatDate(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md bg-muted/20">
                No stock movements yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {item && (
        <InventoryItemDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          existingItem={item}
        />
      )}
    </div>
  );
}

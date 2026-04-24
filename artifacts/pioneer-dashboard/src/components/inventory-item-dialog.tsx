import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAddInventoryItem, useEditInventoryItem } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

const CATEGORIES = [
  { value: "segment_mica", label: "Segment Mica" },
  { value: "molding_mica", label: "Molding Mica" },
  { value: "pei_tape", label: "PEI Tape" },
  { value: "cold_banding_tape", label: "Cold Banding Tape" },
  { value: "brazing_wire", label: "Brazing Wire" },
];

const UNITS = ["sheets", "rolls", "spools", "pieces", "lbs"];

interface ItemFormState {
  category: string;
  product: string;
  unit: string;
  thickness: string;
  sheetSize: string;
  weightPerSheet: string;
  currentStock: string;
  lowStockThreshold: string;
}

const EMPTY_FORM: ItemFormState = {
  category: "",
  product: "",
  unit: "sheets",
  thickness: "",
  sheetSize: "",
  weightPerSheet: "",
  currentStock: "0",
  lowStockThreshold: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  existingItem?: {
    id: number;
    category: string;
    product: string;
    unit: string;
    thickness?: string | null;
    sheetSize?: string | null;
    weightPerSheet?: number | null;
    currentStock: number;
    lowStockThreshold?: number | null;
  };
}

export function InventoryItemDialog({ open, onOpenChange, mode, existingItem }: Props) {
  const { toast } = useToast();
  const addItem = useAddInventoryItem();
  const editItem = useEditInventoryItem();

  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && existingItem) {
        setForm({
          category: existingItem.category,
          product: existingItem.product,
          unit: existingItem.unit,
          thickness: existingItem.thickness ?? "",
          sheetSize: existingItem.sheetSize ?? "",
          weightPerSheet: existingItem.weightPerSheet != null ? String(existingItem.weightPerSheet) : "",
          currentStock: String(existingItem.currentStock),
          lowStockThreshold: existingItem.lowStockThreshold != null ? String(existingItem.lowStockThreshold) : "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, mode, existingItem]);

  const set = (field: keyof ItemFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function handleSubmit() {
    if (!form.category || !form.product.trim() || !form.unit) {
      toast({ title: "Category, product name, and unit are required", variant: "destructive" });
      return;
    }

    const payload = {
      category: form.category,
      product: form.product.trim(),
      unit: form.unit,
      thickness: form.thickness.trim() || undefined,
      sheetSize: form.sheetSize.trim() || undefined,
      weightPerSheet: form.weightPerSheet ? parseFloat(form.weightPerSheet) : null,
      lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : null,
    };

    if (mode === "add") {
      addItem.mutate(
        { ...payload, currentStock: parseInt(form.currentStock, 10) || 0 },
        {
          onSuccess: () => {
            toast({ title: "Item added to inventory" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
        }
      );
    } else if (mode === "edit" && existingItem) {
      editItem.mutate(
        { id: existingItem.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Item updated" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
        }
      );
    }
  }

  const isPending = addItem.isPending || editItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Inventory Item" : "Edit Inventory Item"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Add a new product to the inventory tracked at Pioneer."
              : "Update the details for this inventory item."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unit *</Label>
              <Select value={form.unit} onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Product Name *</Label>
            <Input placeholder='e.g. AVSM 0.060"' value={form.product} onChange={set("product")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Thickness</Label>
              <Input placeholder='e.g. 0.060"' value={form.thickness} onChange={set("thickness")} />
            </div>
            <div className="space-y-1">
              <Label>Sheet Size</Label>
              <Input placeholder='e.g. 37.5" x 37.5"' value={form.sheetSize} onChange={set("sheetSize")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Weight / {form.unit === "sheets" ? "Sheet" : "Unit"} (lbs)</Label>
              <Input type="number" step="0.01" min="0" placeholder="e.g. 5.25" value={form.weightPerSheet} onChange={set("weightPerSheet")} />
            </div>
            <div className="space-y-1">
              <Label>Low Stock Alert At</Label>
              <Input type="number" min="0" placeholder="e.g. 100" value={form.lowStockThreshold} onChange={set("lowStockThreshold")} />
            </div>
          </div>

          {mode === "add" && (
            <div className="space-y-1">
              <Label>Starting Stock</Label>
              <Input type="number" min="0" value={form.currentStock} onChange={set("currentStock")} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : mode === "add" ? "Add Item" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

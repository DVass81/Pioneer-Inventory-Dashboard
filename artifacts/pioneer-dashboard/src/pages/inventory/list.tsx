import { useListInventory } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { Search, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryList() {
  const { data: inventory, isLoading } = useListInventory();
  const [search, setSearch] = useState("");

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    if (!search.trim()) return inventory;
    
    const query = search.toLowerCase();
    return inventory.filter(item => 
      item.product.toLowerCase().includes(query) ||
      formatCategory(item.category).toLowerCase().includes(query) ||
      (item.sheetSize && item.sheetSize.toLowerCase().includes(query)) ||
      (item.thickness && item.thickness.toLowerCase().includes(query))
    );
  }, [inventory, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="inventory-title">Inventory Master List</h1>
        <p className="text-muted-foreground mt-1">Complete listing of all materials stored at Pioneer.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Track stock levels and details.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-8 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-inventory"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead className="text-right">Weight/Sheet</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const isLowStock = item.lowStockThreshold !== null && item.currentStock <= item.lowStockThreshold;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <Link href={`/inventory/${item.id}`} className="hover:underline text-primary flex items-center gap-2" data-testid={`link-product-${item.id}`}>
                            {item.product}
                            {isLowStock && (
                              <AlertTriangle className="w-3 h-3 text-destructive" aria-label="Low stock" />
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs bg-secondary text-secondary-foreground">
                            {formatCategory(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.thickness ? `${item.thickness}` : ''}
                          {item.thickness && item.sheetSize ? ' - ' : ''}
                          {item.sheetSize ? `${item.sheetSize}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.weightPerSheet !== null ? `${item.weightPerSheet} lbs` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn(
                              "font-bold",
                              isLowStock ? "text-destructive" : "text-foreground"
                            )} data-testid={`stock-${item.id}`}>
                              {item.currentStock}
                            </span>
                            <span className="text-xs text-muted-foreground w-12 text-left">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/inventory/${item.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No products found.
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

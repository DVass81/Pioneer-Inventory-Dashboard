import { useListInventory, useCreateReleaseRequest, getGetInventorySummaryQueryKey, getListReleaseRequestsQueryKey, getGetRecentReleaseRequestsQueryKey, getGetInventoryItemQueryKey, getListInventoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Copy, Check, Mail } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const PIONEER_RECIPIENTS = [
  "Taylor.vincent@pioneerindustrialsales.com",
  "shane.parks@pioneerindustrialsales.com",
  "paul.hester@pioneerindustrialsales.com",
  "hank.pennington@pioneerindustrialsales.com",
];

const formSchema = z.object({
  inventoryItemId: z.coerce.number().min(1, { message: "Please select an item" }),
  requestedBy: z.string().min(2, { message: "Name is required" }),
  requestedByEmail: z.string().email({ message: "Valid email is required" }),
  quantity: z.coerce.number().int().positive({ message: "Quantity must be at least 1" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function generateEmailText(opts: {
  requestedBy: string;
  requestedByEmail: string;
  product: string;
  quantity: number;
  unit: string;
  notes?: string;
}) {
  const { requestedBy, requestedByEmail, product, quantity, unit, notes } = opts;
  return `To: ${PIONEER_RECIPIENTS.join("; ")}
Subject: Inventory Release Request — ${product}

Hello Pioneer Team,

Please release the following inventory for ICC International:

  Product:       ${product}
  Quantity:      ${quantity} ${unit}
  Requested By:  ${requestedBy}
  Email:         ${requestedByEmail}
${notes ? `  Notes:         ${notes}` : ""}

Please confirm receipt and advise when the order is ready.

Thank you,
${requestedBy}
ICC International — Maryville, TN`;
}

export default function NewRequest() {
  const { data: inventory, isLoading: isLoadingInventory } = useListInventory();
  const createRequest = useCreateReleaseRequest();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const defaultItemId = searchParams.get("itemId");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inventoryItemId: defaultItemId ? parseInt(defaultItemId, 10) : undefined,
      requestedBy: "",
      requestedByEmail: "",
      quantity: 1,
      notes: "",
    },
  });

  const selectedItemId = form.watch("inventoryItemId");
  const requestedBy = form.watch("requestedBy");
  const requestedByEmail = form.watch("requestedByEmail");
  const quantity = form.watch("quantity");
  const notes = form.watch("notes");
  const selectedItem = inventory?.find(item => item.id === selectedItemId);

  const emailReady = selectedItem && requestedBy?.length >= 2 && quantity >= 1;

  const emailText = emailReady
    ? generateEmailText({
        requestedBy,
        requestedByEmail: requestedByEmail || "",
        product: selectedItem.product,
        quantity,
        unit: selectedItem.unit,
        notes,
      })
    : null;

  const handleCopy = () => {
    if (!emailText) return;
    navigator.clipboard.writeText(emailText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const onSubmit = (data: FormValues) => {
    if (selectedItem && data.quantity > selectedItem.currentStock) {
      form.setError("quantity", {
        type: "manual",
        message: `Cannot request more than current stock (${selectedItem.currentStock} ${selectedItem.unit})`,
      });
      return;
    }

    createRequest.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Request submitted",
          description: "The release request has been created and inventory updated.",
        });
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListReleaseRequestsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentReleaseRequestsQueryKey() });
        if (selectedItemId) {
          queryClient.invalidateQueries({ queryKey: getGetInventoryItemQueryKey(selectedItemId) });
        }
        setLocation("/requests");
      },
      onError: (error) => {
        toast({
          title: "Submission failed",
          description: error.error || "There was an error submitting your request.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="new-request-title">New Release Request</h1>
          <p className="text-muted-foreground mt-1">Submit a request to withdraw materials from inventory.</p>
        </div>
      </div>

      <Card className="shadow-md border-t-4 border-t-primary">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="pt-6 space-y-6">
              <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Item</FormLabel>
                    <Select
                      disabled={isLoadingInventory}
                      onValueChange={(val) => field.onChange(parseInt(val, 10))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-item">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory?.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()} disabled={item.currentStock <= 0}>
                            <div className="flex justify-between items-center w-full">
                              <span>{item.product}</span>
                              <span className="text-muted-foreground ml-4">
                                {item.currentStock} {item.unit}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the material to release. Out of stock items cannot be requested.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="requestedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requester Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Daniel Vass" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requestedByEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requester Email</FormLabel>
                      <FormControl>
                        <Input placeholder="dvass@iccinternational.com" type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity ({selectedItem ? selectedItem.unit : 'units'})</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max={selectedItem?.currentStock || undefined} {...field} data-testid="input-quantity" />
                    </FormControl>
                    {selectedItem && (
                      <FormDescription className={selectedItem.currentStock < field.value ? "text-destructive" : ""}>
                        Max available: {selectedItem.currentStock} {selectedItem.unit}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Job number, project reference, or specific requirements..."
                        className="resize-none"
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="bg-muted/30 pt-6 flex justify-end gap-3">
              <Link href="/requests">
                <Button variant="outline" type="button" data-testid="btn-cancel">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createRequest.isPending} data-testid="btn-submit">
                {createRequest.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {emailText && (
        <Card className="shadow-md border-t-4 border-t-blue-600">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Email to Pioneer</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Email
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Ready-to-send email for Pioneer Industrial Sales. Copy and paste into your email client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-md p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground/80 select-all">
              {emailText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

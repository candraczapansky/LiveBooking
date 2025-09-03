import { Package, Plus, Edit, Trash2, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpProductsDetailed() {
  useDocumentTitle("Help | Products");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add product' },
    { id: 'edit', label: 'Edit product' },
    { id: 'delete', label: 'Delete product' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Products (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Manage product inventory and categories</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create, edit, and manage products with pricing, stock, and categories.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Products grid
              </div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add product</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click Add Product; enter Name, Category, and Price (required).</li>
                <li>Optionally set SKU, stock levels, image, and taxability.</li>
                <li>Save to add the product to inventory.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Add Product dialog
              </div>
            </CardContent>
          </Card>

          <Card id="edit">
            <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit product</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open a product and update fields like price, stock, or image; Save your changes.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Edit Product
              </div>
            </CardContent>
          </Card>

          <Card id="delete">
            <CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete product</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use Delete to remove an item; confirm the action when prompted.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Delete confirmation
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Cannot create product: ensure Name, Category, and Price are filled and valid.</li>
                <li>Image not uploading: check file type/size; try a different image.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">How do categories work?</div>
                <p>Product categories are separate from service categories to keep inventories distinct.</p>
              </div>
              <div>
                <div className="font-medium">Can I track low stock?</div>
                <p>Use min stock level and your reports to identify low or out-of-stock items.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button>
          </div>
        </div>
      </div>
    </div>
  );
}



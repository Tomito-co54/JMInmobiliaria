import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Jotaeme</h1>
        <p className="text-muted-foreground">
          Verificación de componentes shadcn/ui
        </p>
      </div>

      <Separator />

      {/* Buttons */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <Separator />

      {/* Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Card</h2>
        <Card>
          <CardHeader>
            <CardTitle>Casa en Lomas de Zamora</CardTitle>
            <CardDescription>
              3 ambientes - 85m² - USD 120.000
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Badge variant="default">Score 87</Badge>
            <Badge variant="secondary">Match 92%</Badge>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Form inputs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Inputs</h2>
        <div className="space-y-2">
          <Label htmlFor="search">Buscar propiedad</Label>
          <Input id="search" placeholder="Dirección, zona, partido..." />
        </div>
      </section>

      <Separator />

      {/* Tabs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tabs</h2>
        <Tabs defaultValue="venta">
          <TabsList>
            <TabsTrigger value="venta">Venta</TabsTrigger>
            <TabsTrigger value="alquiler">Alquiler</TabsTrigger>
          </TabsList>
          <TabsContent value="venta">
            Propiedades en venta
          </TabsContent>
          <TabsContent value="alquiler">
            Propiedades en alquiler
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* Avatar + Skeleton */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Avatar & Skeleton</h2>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="" alt="User" />
            <AvatarFallback>TM</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      </section>

      <Separator />

      <p className="text-center text-sm text-muted-foreground">
        Setup completado - esta página se elimina después de verificar
      </p>
    </main>
  );
}

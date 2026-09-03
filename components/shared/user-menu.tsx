"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, Heart, Search, LayoutDashboard, BookOpen, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

interface UserMenuProps {
  email: string;
  fullName?: string | null;
  /**
   * Adds the way into /admin. Every other entry here is a buyer-facing route
   * inherited from the upstream portal, so without this the broker had no
   * link anywhere to his own panel — only a typed URL.
   */
  isAdmin?: boolean;
}

export function UserMenu({ email, fullName, isAdmin = false }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  const initials = (fullName || email)
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="size-8">
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {fullName || "Usuario"}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem
              render={
                <Link href="/admin" className="cursor-pointer">
                  <ShieldCheck className="mr-2 size-4" />
                  <span>Panel de administración</span>
                </Link>
              }
            />
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          render={
            <Link href="/buscar" className="cursor-pointer">
              <Search className="mr-2 size-4" />
              <span>Buscar</span>
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/dashboard" className="cursor-pointer">
              <LayoutDashboard className="mr-2 size-4" />
              <span>Mi resumen</span>
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/favoritos" className="cursor-pointer">
              <Heart className="mr-2 size-4" />
              <span>Favoritos</span>
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/perfil" className="cursor-pointer">
              <UserIcon className="mr-2 size-4" />
              <span>Mi perfil</span>
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/guia-de-compra" className="cursor-pointer">
              <BookOpen className="mr-2 size-4" />
              <span>Guía de compra</span>
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
          disabled={isPending}
        >
          <LogOut className="mr-2 size-4" />
          <span>{isPending ? "Cerrando..." : "Cerrar sesión"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

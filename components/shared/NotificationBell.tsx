"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, ArrowDown, Sparkles, AlertCircle, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlertRowWithProperty } from "@/lib/db/alerts";
import {
  markAlertReadAction,
  markAllAlertsReadAction,
} from "@/app/(app)/alertas/actions";

/**
 * Sticky-header bell that opens a sheet with the most recent alerts.
 *
 * The (app) layout loads the initial alerts + unread count on the server
 * and passes them in as props. After interactions (mark read, mark all
 * read) we optimistically zero the badge and let revalidatePath refresh.
 *
 * The bell is also visible to admins (same layout helper); they share
 * the alerts table.
 */

const ALERT_ICON: Record<string, { Icon: typeof Bell; tone: string; label: string }> = {
  new_match: { Icon: Sparkles, tone: "text-emerald-600", label: "Nuevo match" },
  price_drop: { Icon: ArrowDown, tone: "text-blue-600", label: "Bajó de precio" },
  score_change: { Icon: AlertCircle, tone: "text-amber-600", label: "Cambió el score" },
};

interface NotificationBellProps {
  alerts: AlertRowWithProperty[];
  unreadCount: number;
}

export function NotificationBell({ alerts, unreadCount }: NotificationBellProps) {
  const [, startTransition] = useTransition();
  const [optimisticUnread, setOptimisticUnread] = useState(unreadCount);

  function markOne(id: string) {
    setOptimisticUnread((c) => Math.max(0, c - 1));
    startTransition(async () => {
      await markAlertReadAction(id);
    });
  }

  function markAll() {
    setOptimisticUnread(0);
    startTransition(async () => {
      await markAllAlertsReadAction();
    });
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={
              optimisticUnread > 0
                ? `Notificaciones — ${optimisticUnread} sin leer`
                : "Notificaciones"
            }
            className="relative grid place-items-center size-9 rounded-md hover:bg-muted transition-colors"
          >
            <Bell className="size-4" />
            {optimisticUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid place-items-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-600 px-1 text-[0.6rem] font-bold text-white">
                {optimisticUnread > 9 ? "9+" : optimisticUnread}
              </span>
            )}
          </button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notificaciones</SheetTitle>
          <SheetDescription>
            {alerts.length === 0
              ? "Cuando aparezcan matches nuevos o bajen precios, te avisamos acá."
              : `${alerts.length} ${alerts.length === 1 ? "notificación" : "notificaciones"} recientes.`}
          </SheetDescription>
        </SheetHeader>

        {alerts.length > 0 && optimisticUnread > 0 && (
          <div className="px-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAll}
              className="text-xs gap-1"
            >
              <Check className="size-3" />
              Marcar todas como leídas
            </Button>
          </div>
        )}

        <ul className="px-2 pb-4 space-y-1">
          {alerts.map((alert) => {
            const visual = ALERT_ICON[alert.type] ?? {
              Icon: AlertCircle,
              tone: "text-muted-foreground",
              label: alert.type,
            };
            const unread = alert.read_at === null;
            const propertyHref = alert.property_id ? `/p/${alert.property_id}` : null;
            return (
              <li key={alert.id}>
                <div
                  className={cn(
                    "flex gap-3 rounded-md p-3 text-sm transition-colors",
                    unread ? "bg-muted/40" : "opacity-70",
                  )}
                >
                  <visual.Icon className={cn("size-4 mt-0.5 shrink-0", visual.tone)} />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {visual.label}
                    </p>
                    <p className="text-sm leading-tight">{alert.message}</p>
                    {alert.property?.address && (
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.property.address}
                        {alert.property.partido && `, ${alert.property.partido}`}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                        {new Date(alert.sent_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {propertyHref && (
                        <Link
                          href={propertyHref}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver propiedad →
                        </Link>
                      )}
                      {unread && (
                        <button
                          type="button"
                          onClick={() => markOne(alert.id)}
                          className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                        >
                          Marcar leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

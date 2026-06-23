"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { ReactNode } from "react";

export interface MobileCardField {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export interface MobileCardAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  destructive?: boolean;
}

interface MobileCardProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; className?: string };
  fields: MobileCardField[];
  actions?: MobileCardAction[];
  href?: string;
}

export function MobileCard({
  title,
  subtitle,
  badge,
  fields,
  actions,
  href,
}: MobileCardProps) {
  const titleContent = href ? (
    <Link href={href} className="font-medium hover:underline">
      {title}
    </Link>
  ) : (
    <span className="font-medium">{title}</span>
  );

  return (
    <Card className="md:hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            {titleContent}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <Badge variant="secondary" className={`text-xs ${badge.className || ""}`}>
                {badge.label}
              </Badge>
            )}
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, i) =>
                    action.href ? (
                      <DropdownMenuItem key={i}>
                        <Link href={action.href} className="flex items-center w-full">
                          {action.icon}
                          <span className="ml-2">{action.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={i}
                        onClick={action.onClick}
                        className={action.destructive ? "text-destructive" : ""}
                      >
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {fields.map((field, i) => (
            <div key={i} className="contents">
              <span className="text-muted-foreground text-xs">{field.label}</span>
              <span className={field.mono ? "font-mono text-xs" : "text-xs"}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ResponsiveTableProps {
  children: ReactNode;
  mobileCards: ReactNode;
}

export function ResponsiveTable({ children, mobileCards }: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">{children}</div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-4">{mobileCards}</div>
    </>
  );
}

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CardShell({ title, subtitle, actions, children, className = "" }) {
  return (
    <Card className={`bg-white/90 ${className}`}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
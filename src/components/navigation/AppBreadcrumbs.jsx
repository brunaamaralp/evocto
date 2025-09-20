
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

function prettify(segment) {
  return segment
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function AppBreadcrumbs({ hideOn = ["/", "/dashboard"] }) {
  const location = useLocation();
  const path = location.pathname || "/";
  if (hideOn.includes(path)) return null;

  const parts = path.split("/").filter(Boolean);
  const crumbs = parts.map((seg, idx) => {
    let href = "/" + parts.slice(0, idx + 1).join("/");
    // Regra específica mantida
    if (href === "/playbooks") {
      href = "/library?tab=playbooks";
    }
    return { label: prettify(seg), href, current: idx === parts.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="flex items-center">
        <ol className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600">
          <li>
            <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Início</span>
            </Link>
          </li>
          {crumbs.map((c) => (
            <li key={c.href} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1 text-slate-400" aria-hidden="true" />
              {c.current ? (
                <span aria-current="page" className="font-medium text-slate-900">{c.label}</span>
              ) : (
                <Link to={c.href} className="hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">{c.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function SafeLink({ to, children, className = "", pendingClassName = "", onNavigate, replace = false, prefetch = false, ...rest }) {
  const navigate = useNavigate();
  const [pending, setPending] = React.useState(false);

  const handleClick = async (e) => {
    if (!to) return;
    // Permitir ctrl/cmd + click para nova aba
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    try {
      setPending(true);
      if (typeof onNavigate === "function") await onNavigate();
      // prefetch placeholder (futuro)
      navigate(to, { replace });
    } finally {
      // Mantém breve para mostrar feedback de transição
      setTimeout(() => setPending(false), 300);
    }
  };

  return (
    <Link
      aria-label={typeof children === "string" ? children : "Abrir link"}
      to={to || "#"}
      onClick={handleClick}
      className={`${className} ${pending ? pendingClassName : ""}`}
      {...rest}
    >
      <span className="inline-flex items-center gap-1">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" aria-hidden="true" />}
        {children}
      </span>
    </Link>
  );
}
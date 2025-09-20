
import React, { useState, useRef, useEffect, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import { Info, HelpCircle, AlertCircle, CheckCircle } from "lucide-react";

// Simple classNames helper (avoids external deps)
function cn(...args) {
  return args.flat().filter(Boolean).join(" ");
}

// Context to share tooltip state
const TooltipCtx = createContext(null);

const TooltipProvider = ({ children }) => children;

function Tooltip({ children, delayDuration = 200, ...props }) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [side, setSide] = useState("top");
  const [offset, setOffset] = useState(8);
  const hoverTimerRef = useRef(null); // replaces previous timerRef

  const value = {
    open,
    setOpen,
    anchorEl,
    setAnchorEl,
    delayDuration,
    side,
    setSide,
    offset,
    setOffset,
    hoverTimerRef, // expose timer ref in context
  };

  // removed effect that referenced timerRef.current to avoid lint/runtime warning

  return (
    <TooltipCtx.Provider value={value}>
      <div {...props}>{children}</div>
    </TooltipCtx.Provider>
  );
}

function TooltipTrigger({ asChild = false, children, onMouseEnter, onMouseLeave, onFocus, onBlur }) {
  const ctx = useContext(TooltipCtx);
  const child = React.Children.only(children);

  const handleOpen = () => {
    if (ctx?.hoverTimerRef?.current) clearTimeout(ctx.hoverTimerRef.current);
    ctx.hoverTimerRef.current = setTimeout(() => ctx.setOpen(true), ctx?.delayDuration || 0);
  };
  const handleClose = () => {
    if (ctx?.hoverTimerRef?.current) clearTimeout(ctx.hoverTimerRef.current);
    ctx.setOpen(false);
  };

  const propsHandlers = {
    ref: (node) => ctx.setAnchorEl(node),
    onMouseEnter: (e) => {
      handleOpen();
      onMouseEnter && onMouseEnter(e);
    },
    onMouseLeave: (e) => {
      handleClose();
      onMouseLeave && onMouseLeave(e);
    },
    onFocus: (e) => {
      handleOpen();
      onFocus && onFocus(e);
    },
    onBlur: (e) => {
      handleClose();
      onBlur && onBlur(e);
    },
  };

  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, {
      ...propsHandlers,
      ...child.props,
      ref: (node) => {
        propsHandlers.ref(node);
        if (typeof child.ref === "function") child.ref(node);
      },
    });
  }

  return (
    <span
      {...propsHandlers}
      className="inline-flex items-center"
      style={{ cursor: "inherit" }}
    >
      {children}
    </span>
  );
}

function TooltipContent({ children, className = "", side = "top", sideOffset = 8, ...props }) {
  const ctx = useContext(TooltipCtx);
  const [pos, setPos] = useState({ top: 0, left: 0, transform: "" });

  useEffect(() => {
    if (!ctx) return;
    ctx.setSide && ctx.setSide(side);
    ctx.setOffset && ctx.setOffset(sideOffset);
  }, [ctx, side, sideOffset]);

  useEffect(() => {
    if (!ctx?.open || !ctx?.anchorEl) return;

    const updatePosition = () => {
      const rect = ctx.anchorEl.getBoundingClientRect();
      let top = 0;
      let left = 0;
      let transform = "";

      const gap = sideOffset ?? 8;

      switch (side) {
        case "bottom":
          top = rect.bottom + gap + window.scrollY;
          left = rect.left + rect.width / 2 + window.scrollX;
          transform = "translate(-50%, 0)";
          break;
        case "left":
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.left - gap + window.scrollX;
          transform = "translate(-100%, -50%)";
          break;
        case "right":
          top = rect.top + rect.height / 2 + window.scrollY;
          left = rect.right + gap + window.scrollX;
          transform = "translate(0, -50%)";
          break;
        case "top":
        default:
          top = rect.top - gap + window.scrollY;
          left = rect.left + rect.width / 2 + window.scrollX;
          transform = "translate(-50%, -100%)";
          break;
      }

      setPos({ top, left, transform });
    };

    updatePosition();
    const listeners = ["scroll", "resize"];
    const onMove = () => updatePosition();
    listeners.forEach((ev) => window.addEventListener(ev, onMove, { passive: true }));
    return () => listeners.forEach((ev) => window.removeEventListener(ev, onMove));
  }, [ctx?.open, ctx?.anchorEl, side, sideOffset]);

  if (!ctx?.open) return null;

  const content = (
    <div
      role="tooltip"
      className={cn(
        "z-50 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        transform: pos.transform,
        pointerEvents: "none",
      }}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}

// Enhanced tooltips built on top of the primitives
const EnhancedTooltip = ({
  children,
  content,
  type = "info",
  icon = true,
  side = "top",
  className = "",
  trigger,
  delayDuration = 400,
}) => {
  const icons = { info: Info, help: HelpCircle, warning: AlertCircle, success: CheckCircle };
  const colors = {
    info: "border-slate-200 bg-slate-900 text-slate-50",
    help: "border-blue-200 bg-blue-900 text-blue-50",
    warning: "border-amber-200 bg-amber-900 text-amber-50",
    success: "border-green-200 bg-green-900 text-green-50",
  };
  const IconComponent = icons[type] || Info;

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {trigger || (
          <button
            className="inline-flex items-center justify-center w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Ajuda"
            type="button"
          >
            {icon && <IconComponent className="w-4 h-4" />}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          "rounded-lg px-3 py-2 shadow-lg border",
          colors[type],
          className
        )}
      >
        <div className="flex items-start gap-2">
          {icon && <IconComponent className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div className="text-sm leading-relaxed">{content}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const SimpleTooltip = ({ children, content, side = "top", ...props }) => (
  <Tooltip {...props}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>
      <p>{content}</p>
    </TooltipContent>
  </Tooltip>
);

const HelpTooltip = ({ content, placement = "right" }) => (
  <EnhancedTooltip
    content={content}
    type="help"
    side={placement}
    trigger={
      <button
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors ml-2"
        type="button"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
    }
  />
);

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  EnhancedTooltip,
  SimpleTooltip,
  HelpTooltip,
};

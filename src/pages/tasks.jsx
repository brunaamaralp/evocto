import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TasksRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const base = createPageUrl("tasks-manager");
    navigate(`${base}${location.search || ""}${location.hash || ""}`, { replace: true });
  }, [navigate, location.search, location.hash]);

  return null;
}

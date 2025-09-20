import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TasksRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl("tasks-manager"), { replace: true });
  }, [navigate]);
  return null;
}
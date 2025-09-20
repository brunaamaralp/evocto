import React from "react";
import { useLocation } from "react-router-dom";

export default function RouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // start
    setVisible(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(60), 120);
    const t2 = setTimeout(() => setProgress(85), 300);
    const t3 = setTimeout(() => {
      setProgress(100);
      // finish
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 500);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [location.key]); // altera a cada navegação

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
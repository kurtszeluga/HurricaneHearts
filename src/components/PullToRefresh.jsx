import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 86;
const MAX_PULL = 118;

function isInteractiveElement(target) {
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [role='button'], [contenteditable='true']"
    )
  );
}

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);

  useEffect(() => {
    const onTouchStart = (event) => {
      if (refreshing || isInteractiveElement(event.target)) {
        tracking.current = false;
        return;
      }

      const touch = event.touches[0];
      startY.current = touch.clientY;
      startX.current = touch.clientX;
      tracking.current = window.scrollY <= 0;
    };

    const onTouchMove = (event) => {
      if (!tracking.current || refreshing || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const deltaY = touch.clientY - startY.current;
      const deltaX = Math.abs(touch.clientX - startX.current);

      if (deltaY <= 0 || deltaX > 40 || window.scrollY > 0) {
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      setPullDistance(Math.min(deltaY * 0.55, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;

      tracking.current = false;

      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        window.location.reload();
        return;
      }

      setPullDistance(0);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const visible = pullDistance > 0 || refreshing;
  const ready = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      className={
        visible
          ? "fixed left-0 right-0 top-0 z-[9999] flex justify-center transition-opacity duration-150 opacity-100"
          : "fixed left-0 right-0 top-0 z-[9999] flex justify-center pointer-events-none transition-opacity duration-150 opacity-0"
      }
      style={{
        transform: `translateY(${Math.max(pullDistance - 48, 0)}px)`,
        paddingTop: "env(safe-area-inset-top)"
      }}
      aria-live="polite"
    >
      <div className="mt-2 rounded-full border border-[#c7d0dc] bg-white px-4 py-2 text-xs font-semibold text-[#172033] shadow-lg">
        {refreshing
          ? "Refreshing..."
          : ready
            ? "Release to refresh"
            : "Pull to refresh"}
      </div>
    </div>
  );
}

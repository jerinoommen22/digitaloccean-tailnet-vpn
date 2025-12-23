import { useState, useEffect, useRef } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<any>) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const currentPullDistance = useRef(0); // Track distance in ref to avoid re-renders impacting listeners
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Use passive: false to allow preventDefault if we decide to block scrolling
        // But for PWA pull-to-refresh, we usually want to allow scroll if not pulling.

        const handleTouchStart = (e: TouchEvent) => {
            // Only tracking if at top
            if (window.scrollY <= 1) { // Tolerance of 1px
                startY.current = e.touches[0].clientY;
                currentPullDistance.current = 0;
            } else {
                startY.current = -1; // Ignore this gesture
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startY.current === -1) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            // Only allow pulling if we are at the top and pulling down
            if (window.scrollY <= 1 && diff > 0) {
                // Prevent native scroll/rubber banding logic if we wanted, 
                // but 'overscroll-behavior-y: none' on body handles the bounce.

                // resistance
                const newDist = Math.min(diff * 0.5, 150);
                currentPullDistance.current = newDist;

                // Update state for UI ONLY if it changed significantly to avoid spamming
                // But React state updates are batched usually. 
                // We'll update it directly to keep UI responsive.
                setPullDistance(newDist);

                // If we want to prevent browser native behaviors:
                if (e.cancelable) {
                    // e.preventDefault(); // Uncommenting this might break scroll in some cases, use with care.
                }
            }
        };

        const handleTouchEnd = async () => {
            if (startY.current === -1) return;

            if (currentPullDistance.current > 80) { // Threshold
                setIsRefreshing(true);
                setPullDistance(80); // Snap 
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                    currentPullDistance.current = 0;
                }
            } else {
                setPullDistance(0);
                currentPullDistance.current = 0;
            }
            startY.current = -1; // Reset
        };

        // Important: Remove 'pullDistance' from dependencies so listeners don't rebind
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true }); // passive true for scroll perfs, assuming CSS handles overscroll
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onRefresh]); // Only rebind if onRefresh changes

    return { containerRef, isRefreshing, pullDistance };
}

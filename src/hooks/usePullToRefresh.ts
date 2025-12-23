import { useState, useEffect, useRef } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<any>) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            // Only allow pulling if we are at the top and pulling down
            if (window.scrollY === 0 && diff > 0) {
                // Add resistance
                setPullDistance(Math.min(diff * 0.5, 150));
            }
        };

        const handleTouchEnd = async () => {
            if (pullDistance > 80) { // Threshold
                setIsRefreshing(true);
                setPullDistance(80); // Snap to loading state
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                setPullDistance(0);
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, onRefresh]);

    return { containerRef, isRefreshing, pullDistance };
}

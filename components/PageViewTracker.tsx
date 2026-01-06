"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "../utils/analytics";

/**
 * Inner component that uses useSearchParams
 * Must be wrapped in Suspense for static generation
 */
function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view when pathname or search params change
    // Handle null pathname (shouldn't happen, but TypeScript requires it)
    if (!pathname) return;

    const search = searchParams?.toString()
      ? `?${searchParams.toString()}`
      : "";
    trackPageView(pathname, search);
  }, [pathname, searchParams]);

  // This component doesn't render anything
  return null;
}

/**
 * Component to track page views on route changes
 * This ensures GA4 receives proper page_title and page_location
 *
 * Usage: Add <PageViewTracker /> to your root layout
 *
 * Wrapped in Suspense to satisfy Next.js static generation requirements
 */
export default function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}

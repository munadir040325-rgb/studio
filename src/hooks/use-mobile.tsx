"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

// This hook is safe for SSR because it initializes with `false` and only
// checks the window width on the client-side after the component has mounted.
// This avoids hydration mismatches.
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount (only runs on client)
    checkIsMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}

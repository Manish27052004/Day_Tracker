import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const hasConsented = localStorage.getItem("cookie_consent");
    if (!hasConsented) {
      // Small delay to ensure smooth rendering
      const timeout = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timeout);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          We use cookies, including third-party cookies from Google, to serve personalized ads and analyze traffic. 
          By clicking "Accept", you consent to our use of cookies as described in our{" "}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button variant="default" onClick={handleAccept} className="whitespace-nowrap">
            Accept Cookies
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

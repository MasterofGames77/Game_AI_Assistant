import "./styles/global.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import PageViewTracker from "../components/PageViewTracker";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const measurementId = process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Initialize dark mode before React hydration to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (theme === 'dark' || (theme === 'system' && systemPrefersDark) || (!theme && systemPrefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    if (theme === 'light') {
                      document.documentElement.classList.add('light');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Unregister any existing service workers from splash page or other sources */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister().then(function(success) {
                        if (success) {
                          console.log('Service worker unregistered successfully');
                        }
                      });
                    }
                  });
                }
              })();
            `,
          }}
        />
        {/* Google Analytics 4 - Only load if measurement ID is configured */}
        {measurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${measurementId}', {
                  page_path: window.location.pathname,
                  page_title: document.title,
                  page_location: window.location.href,
                  send_page_view: false // We'll manually send page views via PageViewTracker
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        {measurementId && <PageViewTracker />}
        {children}
        <Toaster />
      </body>
    </html>
  );
}

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover enables safe-area insets; max-scale stops iOS focus-zoom.
            interactive-widget=resizes-content lets the keyboard shrink the layout so
            inset:0 on #root tracks it without a JS pixel lock. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#051E39" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <title>Georgia Tech Football</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
                overscroll-behavior: none;
                background-color: #051E39;
                -webkit-text-size-adjust: 100%;
                touch-action: pan-y;
              }
              /*
                Pin #root to all four edges of the canvas. Do not lock height to a
                pixel value from visualViewport / innerHeight.

                iOS Chrome's first read of those APIs (script in <head>, before
                layout) is often too small. Resize never fires, so the tab bar
                sits mid-screen with a navy gap until the user refreshes — by
                then the viewport has settled and the next measurement is right.
              */
              html body #root {
                position: fixed;
                inset: 0;
                height: auto;
                max-height: none;
                min-height: 0;
                width: auto;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background-color: #051E39;
              }
              input, textarea, select {
                font-size: 16px !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

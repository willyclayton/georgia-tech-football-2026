import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover enables safe-area insets; max-scale stops iOS focus-zoom fighting the layout */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#051E39" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <title>Georgia Tech Football</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --app-height: 100svh;
                --app-top: 0px;
              }
              html, body, #root {
                height: var(--app-height, 100svh);
                max-height: var(--app-height, 100svh);
                width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
                overscroll-behavior: none;
                background-color: #051E39;
                -webkit-text-size-adjust: 100%;
                touch-action: pan-y;
              }
              #root {
                display: flex;
                flex-direction: column;
                position: fixed;
                top: var(--app-top, 0px);
                left: 0;
                right: 0;
                bottom: auto;
              }
              /* Keep RN web inputs from triggering Safari auto-zoom */
              input, textarea, select {
                font-size: 16px !important;
              }
            `,
          }}
        />
        {/* Run before paint so the shell never starts taller than the visible Safari viewport */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function apply() {
                  var vv = window.visualViewport;
                  var h = Math.round(Math.min(vv ? vv.height : window.innerHeight, window.innerHeight));
                  var t = Math.round(vv ? vv.offsetTop : 0);
                  document.documentElement.style.setProperty('--app-height', h + 'px');
                  document.documentElement.style.setProperty('--app-top', t + 'px');
                }
                apply();
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', apply);
                  window.visualViewport.addEventListener('scroll', apply);
                }
                window.addEventListener('resize', apply);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

// mdBook's sidebar element, rendered by Reader.tsx so mdBook's and the reader's CSS find it.
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mdbook-sidebar-scrollbox': React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement> & { class?: string };
    }
  }
}

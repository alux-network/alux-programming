/** Required UI elements fail at their boundary rather than hiding a broken render. */
export function query<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing reader element: ${selector}`);
  return element;
}
export function targetElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

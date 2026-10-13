/** Native modal dialog blocks background clicks and keeps keyboard focus inside. */
export function openPaymentDialog(dialog: HTMLDialogElement, view: Window = window) {
  const { document } = view;
  const body = document.body;
  const root = document.documentElement;
  const previousFocus = document.activeElement as HTMLElement | null;
  const scrollX = view.scrollX;
  const scrollY = view.scrollY;
  const properties = ['position', 'top', 'left', 'width', 'overflow', 'padding-right', 'box-sizing'];
  const saved = properties.map(property => [property, body.style.getPropertyValue(property), body.style.getPropertyPriority(property)]);
  const rootOverflow = [root.style.getPropertyValue('overflow'), root.style.getPropertyPriority('overflow')];
  const scrollBehavior = [root.style.getPropertyValue('scroll-behavior'), root.style.getPropertyPriority('scroll-behavior')];
  const gutter = Math.max(0, view.innerWidth - root.clientWidth);
  const paddingRight = parseFloat(view.getComputedStyle(body).paddingRight) || 0;

  // Fix the page at its current position, including on mobile browsers.
  body.style.setProperty('position', 'fixed');
  body.style.setProperty('top', `${-scrollY}px`);
  body.style.setProperty('left', `${-scrollX}px`);
  body.style.setProperty('width', '100%');
  body.style.setProperty('overflow', 'hidden');
  body.style.setProperty('box-sizing', 'border-box');
  if (gutter) body.style.setProperty('padding-right', `${paddingRight + gutter}px`);
  root.style.setProperty('overflow', 'hidden');

  const restore = () => {
    for (const [property, value, priority] of saved) body.style.setProperty(property, value, priority);
    root.style.setProperty('overflow', ...rootOverflow as [string, string]);
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    view.scrollTo(scrollX, scrollY);
    root.style.setProperty('scroll-behavior', ...scrollBehavior as [string, string]);
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };

  try {
    dialog.showModal();
  } catch (error) {
    restore();
    throw error;
  }

  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    dialog.close();
    restore();
  };
}

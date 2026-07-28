export default function MyOrdersLayout({ children }) {
  return (
    <div className="sp-orders-shell min-h-[calc(100dvh-4rem)] pb-24 lg:pb-8">
      {children}
    </div>
  );
}

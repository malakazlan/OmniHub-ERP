export default function LedgerLayout({ children }) {
  return (
    <div className="erp-ledger-surface -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 py-4 min-h-full">
      {children}
    </div>
  );
}

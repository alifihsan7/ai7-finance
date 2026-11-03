export function HiddenAmount() {
  return (
    <>
      <span className="sr-only">Nominal disembunyikan</span>
      <span className="luma-hidden-amount" aria-hidden="true">
        <span>Rp</span>
        <span className="luma-hidden-amount-dots">••••••</span>
      </span>
    </>
  );
}

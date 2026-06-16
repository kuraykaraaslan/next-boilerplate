/** Format a number the way the GİB portal expects it: "1.234,56". */
export function trNum(n: number): string {
  const fixed = (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

/**
 * Format the GİB-compatible invoice ID: 3-letter prefix + year + 9-digit
 * sequence, e.g. `INV2025000000001`. We derive it from our own
 * `invoiceNumber` by stripping non-digit chars and zero-padding.
 */
export function formatGibInvoiceNumber(invoiceNumber: string, issueDate: Date): string {
  const year = issueDate.getUTCFullYear();
  const seq = (invoiceNumber.match(/\d+$/)?.[0] ?? '0').padStart(9, '0');
  return `INV${year}${seq}`;
}

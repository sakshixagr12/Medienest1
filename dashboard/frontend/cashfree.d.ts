declare module "@cashfreepayments/cashfree-js" {
  export function load(options: { mode: "production" | "sandbox" }): Promise<any>;
}

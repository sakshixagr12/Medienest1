const { Cashfree, CFEnvironment } = require("cashfree-pg");
require("dotenv").config();

// Cashfree PG SDK Initialization
const cashfree = new Cashfree(
  process.env.CASHFREE_ENV === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

async function test() {
  const orderId = `test_order_${Date.now()}`;
  const request = {
    order_amount: 99.00,
    order_currency: "INR",
    order_id: orderId,
    customer_details: {
      customer_id: "63bcf233-7596-4cab-bf25-ed8e22f95d2d",
      customer_phone: "9999999999",
      customer_email: "billing@medienest.care",
      customer_name: "Clinic Owner"
    },
    order_meta: {
      return_url: `https://localhost:3000/portal/clinic-settings?order_id={order_id}`
    }
  };

  try {
    console.log("Sending create order request to Cashfree...");
    const cfResponse = await cashfree.PGCreateOrder(request);
    console.log("SUCCESS!");
    console.log("Response status:", cfResponse.status);
    console.log("Response data:", cfResponse.data);
  } catch (err) {
    console.error("FAILED!");
    console.error("Error message:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

test();

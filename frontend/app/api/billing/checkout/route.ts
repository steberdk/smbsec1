/**
 * POST /api/billing/checkout — create a Stripe Checkout session
 *
 * Returns { url: string } with the Stripe Checkout URL to redirect the user to.
 * If STRIPE_SECRET_KEY is not configured, returns 501 with a friendly message.
 */

import { NextResponse } from "next/server";
import { supabaseForRequest } from "../../../../lib/supabase/server";
import {
  apiError,
  getUser,
  getOrgMembership,
  hasRole,
} from "../../../../lib/api/helpers";
import { rateLimit, rateLimitKey } from "../../../../lib/api/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = supabaseForRequest(req);

  const user = await getUser(supabase);
  if (!user) return apiError("Unauthorized", 401);

  const rl = rateLimit(rateLimitKey(req, user.id));
  if (rl) return rl;

  const membership = await getOrgMembership(supabase, user.id);
  if (!membership) return apiError("Not a member of any organisation", 404);
  if (!hasRole(membership, "org_admin"))
    return apiError("Only org admins can manage billing", 403);

  // Check if Stripe is configured
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return apiError(
      "Payment processing is not configured yet. Paid plans are launching soon.",
      501
    );
  }

  // Dynamically import Stripe (only when key is available)
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey);

  // Get org info for Stripe metadata
  const { data: org } = await supabase
    .from("orgs")
    .select("id, name, stripe_customer_id")
    .eq("id", membership.org_id)
    .single();

  if (!org) return apiError("Organisation not found", 404);

  // Check if already subscribed
  if (org.stripe_customer_id) {
    // Check existing subscription status
    const { data: orgStatus } = await supabase
      .from("orgs")
      .select("subscription_status")
      .eq("id", membership.org_id)
      .single();

    if (orgStatus?.subscription_status === "active") {
      return apiError("Organisation already has an active subscription", 400);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://smbsec1.vercel.app";

  // Create or reuse Stripe customer
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: org.name,
      metadata: {
        org_id: org.id,
        user_id: user.id,
      },
    });
    customerId = customer.id;

    // Store customer ID
    await supabase
      .from("orgs")
      .update({ stripe_customer_id: customerId })
      .eq("id", membership.org_id);
  }

  // Create Checkout session
  const priceId = process.env.STRIPE_PRICE_ID;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "eur",
              unit_amount: 1500, // EUR 15.00
              recurring: { interval: "month" },
              product_data: {
                name: "Campaign Pro",
                description:
                  "Unlimited phishing simulation campaigns for your organisation",
              },
            },
            quantity: 1,
          },
        ],
    success_url: `${appUrl}/workspace/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${appUrl}/workspace/billing?cancelled=true`,
    metadata: {
      org_id: org.id,
    },
  });

  return NextResponse.json({ url: session.url });
}

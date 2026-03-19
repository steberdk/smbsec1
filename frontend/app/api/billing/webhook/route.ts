/**
 * POST /api/billing/webhook — Stripe webhook handler
 *
 * Handles:
 *   - checkout.session.completed — activate subscription, grant unlimited credits
 *   - customer.subscription.deleted — cancel subscription, reset credits
 *   - customer.subscription.updated — update status based on subscription state
 *
 * Protected by Stripe webhook signature verification.
 * If STRIPE_SECRET_KEY is not configured, returns 501.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export async function POST(req: Request): Promise<NextResponse> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 501 }
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey);

  // Read raw body for signature verification
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // No webhook secret — parse but skip verification (dev only)
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Service-role client for DB updates
  const supabase = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      db: { schema: "smbsec1" },
    }
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.org_id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (orgId) {
        await supabase
          .from("orgs")
          .update({
            subscription_status: "active",
            stripe_subscription_id: subscriptionId ?? null,
            campaign_credits: 9999, // Unlimited credits for paid orgs
          })
          .eq("id", orgId);

        console.log(`Subscription activated for org ${orgId}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        // Find org by stripe_customer_id
        const { data: org } = await supabase
          .from("orgs")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (org) {
          await supabase
            .from("orgs")
            .update({
              subscription_status: "cancelled",
              campaign_credits: 0,
            })
            .eq("id", org.id);

          console.log(`Subscription cancelled for org ${org.id}`);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
      const status = subscription.status;

      if (customerId) {
        const { data: org } = await supabase
          .from("orgs")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (org) {
          const newStatus =
            status === "active" || status === "trialing"
              ? "active"
              : status === "canceled" || status === "unpaid"
              ? "cancelled"
              : "free";

          const newCredits =
            newStatus === "active" ? 9999 : 0;

          await supabase
            .from("orgs")
            .update({
              subscription_status: newStatus,
              campaign_credits: newCredits,
            })
            .eq("id", org.id);
        }
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}

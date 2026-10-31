"use client"

import { useCallback, useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startBookingCheckout } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export function BookingPayment({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  const start = useCallback(() => startBookingCheckout(bookingId), [bookingId])
  if (!open) return <button type="button" className="button button-dark" onClick={() => setOpen(true)}>Betal booking</button>
  return <div className="payment-panel"><EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: start }}><EmbeddedCheckout /></EmbeddedCheckoutProvider></div>
}

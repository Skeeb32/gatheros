"use client";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { money, calculateTotal } from "@/lib/utils/money";
import type { TicketType } from "@/types/events";
const schema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
export function PurchaseForm({
  tickets,
  demo,
  bps,
}: {
  tickets: TicketType[];
  demo: boolean;
  bps: number;
}) {
  const [id, setId] = useState(tickets[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const ticket = tickets.find((t) => t.id === id);
  const total = calculateTotal(ticket?.price_cents || 0, quantity, bps);
  const available = ticket
    ? ticket.quantity - ticket.quantity_sold - ticket.quantity_reserved
    : 0;
  return (
    <form
      onChange={() => {
        key.current = "";
      }}
      onSubmit={handleSubmit(async (values) => {
        setBusy(true);
        setMessage("");
        try {
          key.current ||= crypto.randomUUID();
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...values,
              ticketTypeId: id,
              quantity,
              requestKey: key.current,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          window.location.assign(data.url);
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Checkout failed",
          );
        } finally {
          setBusy(false);
        }
      })}
      className="space-y-5"
    >
      <h2 className="serif text-3xl">Save your spot.</h2>
      <label>
        Choose your ticket
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {tickets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {money(t.price_cents)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Guests
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        >
          {Array.from(
            { length: Math.min(10, Math.max(1, available)) },
            (_, i) => (
              <option key={i}>{i + 1}</option>
            ),
          )}
        </select>
      </label>
      <div className="field-grid">
        <label>
          First name
          <input autoComplete="given-name" {...register("firstName")} />
        </label>
        <label>
          Last name
          <input autoComplete="family-name" {...register("lastName")} />
        </label>
      </div>
      <label>
        Email address
        <input type="email" autoComplete="email" {...register("email")} />
      </label>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-red-700 text-sm">
          Enter your name and a valid email.
        </p>
      )}
      <div className="text-sm space-y-3 border-y border-border py-5">
        <p className="flex justify-between muted">
          <span>Tickets × {quantity}</span>
          <span>{money(total.subtotal)}</span>
        </p>
        <p className="flex justify-between muted">
          <span>Booking fee</span>
          <span>{money(total.fee)}</span>
        </p>
        <p className="flex justify-between font-bold">
          <span>Total</span>
          <span>{money(total.total)}</span>
        </p>
      </div>
      <Button
        className="w-full"
        disabled={busy || !ticket || available < quantity}
      >
        {busy
          ? "Opening checkout…"
          : available < quantity
            ? "Sold out"
            : total.total
              ? "Continue to checkout"
              : "Reserve tickets"}
      </Button>
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <p className="text-[11px] leading-5 muted text-center">
        {demo
          ? "Demo event. Purchases are disabled."
          : "Secure checkout. Tickets delivered to your inbox."}
      </p>
    </form>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
export function Scanner({ eventId, demo }: { eventId: string; demo: boolean }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Ready when your guests are.");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (frame.current) clearTimeout(frame.current);
  };
  useEffect(() => () => stop(), []);
  async function submit(value: string) {
    stop();
    if (demo) {
      setMessage("Demo mode: connect Supabase to check in real tickets.");
      setSuccess(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketCode: value.trim(), eventId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setSuccess(result.success);
      setMessage(
        result.success
          ? `Welcome, ${result.name}. ${result.ticketType} — checked in.`
          : String(result.reason).replaceAll("_", " "),
      );
      setCode("");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    try {
      const Constructor = (
        window as unknown as {
          BarcodeDetector?: new (o: { formats: string[] }) => Detector;
        }
      ).BarcodeDetector;
      if (!Constructor) {
        setMessage(
          "Camera scanning is not supported in this browser. Use a USB scanner or paste the ticket code below.",
        );
        return;
      }
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.current!.srcObject = stream.current;
      await video.current!.play();
      const detector = new Constructor({ formats: ["qr_code"] });
      const scan = async () => {
        if (!stream.current) return;
        try {
          const codes = await detector.detect(video.current!);
          if (codes[0]) {
            await submit(codes[0].rawValue);
            return;
          }
          frame.current = setTimeout(scan, 200);
        } catch {
          stop();
          setMessage("Camera scanning failed. Enter the code below.");
        }
      };
      await scan();
    } catch {
      stop();
      setMessage(
        "Camera unavailable. Allow camera access or enter the code below.",
      );
    }
  }
  return (
    <div className="panel max-w-xl space-y-6">
      <div className="bg-secondary rounded-xl p-8 text-center">
        <ScanLine className="mx-auto text-primary mb-4" size={64} />
        <p className="text-sm muted">One ticket. One welcome.</p>
        <video
          ref={video}
          playsInline
          muted
          className="w-full rounded-lg mt-4"
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" onClick={start} disabled={busy}>
          <Camera size={17} />
          Use camera
        </Button>
        <Button type="button" variant="outline" onClick={stop}>
          Stop camera
        </Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
        className="space-y-4"
      >
        <label>
          Ticket code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder="Scan or paste the QR code value"
            required
          />
        </label>
        <Button disabled={busy || !code} className="w-full">
          {busy ? "Checking…" : "Check in guest"}
        </Button>
      </form>
      <p role="status" className={`notice ${success ? "!bg-green-100" : ""}`}>
        {message}
      </p>
    </div>
  );
}

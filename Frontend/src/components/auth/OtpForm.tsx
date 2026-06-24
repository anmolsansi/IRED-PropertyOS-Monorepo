"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useVerifyOtp, useResendOtp } from "@/hooks/use-auth";

const OTP_LENGTH = 6;

export function OtpForm() {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [resendCooldown, setResendCooldown] = useState(30);
  const verifyingRef = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  const devOtp = searchParams.get("devOtp");
  const { verify, isLoading } = useVerifyOtp();
  const { resend, isLoading: isResending } = useResendOtp();
  const canResend = resendCooldown === 0 && !isResending;

  useEffect(() => {
    if (!userId) {
      router.replace("/login");
    }
  }, [userId, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      value = value.replace(/\D/g, "");
      if (value.length > 1) return;

      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedData = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
      const newOtp = [...otp];

      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }

      setOtp(newOtp);

      const nextEmptyIndex = newOtp.findIndex((digit) => digit === "");
      const focusIndex = nextEmptyIndex === -1 ? OTP_LENGTH - 1 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
    },
    [otp],
  );

  async function handleVerify(code: string) {
    if (!userId || verifyingRef.current) return;

    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit OTP code.");
      return;
    }

    verifyingRef.current = true;
    const user = await verify(userId, code);
    verifyingRef.current = false;

    if (!user) {
      toast.error("Invalid or expired OTP. Please try again.");
      setOtp(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      return;
    }

    toast.success("OTP verified successfully!");
    router.push("/dashboard");
  }

  async function handleResend() {
    if (!canResend || !userId) return;

    setResendCooldown(30);
    const success = await resend(userId);
    if (success) {
      toast.success("A new OTP has been sent to your email.");
    } else {
      toast.error("Failed to resend OTP. Please try again.");
    }
  }

  const isComplete = otp.every((digit) => digit !== "");

  if (!userId) return null;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl">Verify your identity</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to {email || "your email address"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="h-12 w-12 text-center text-lg font-semibold"
              disabled={isLoading}
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}
        </div>

        {devOtp && (
          <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-center text-sm">
            Dev OTP: <span className="font-mono font-semibold">{devOtp}</span>
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!isComplete || isLoading}
          onClick={() => handleVerify(otp.join(""))}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {canResend
                ? "Resend code"
                : `Resend in ${resendCooldown}s`}
            </button>
          </p>

          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

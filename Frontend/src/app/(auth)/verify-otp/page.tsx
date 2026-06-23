import { Suspense } from "react";
import { OtpForm } from "@/components/auth/OtpForm";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpForm />
    </Suspense>
  );
}

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useRequestOtp, useVerifyOtp } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const [identifier, setIdentifier] = useState("");
  const [resolvedTelegramId, setResolvedTelegramId] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await requestOtp.mutateAsync(identifier);
      setResolvedTelegramId(result.telegramId);
      setStep(2);
    } catch {
      /* error handled by toast */
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp.mutateAsync({ telegramId: resolvedTelegramId, otp });
    } catch {
      /* error handled by toast */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 text-center mb-6">Admin Login</h1>

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Input
                label="Telegram ID or Username"
                placeholder="e.g. 6142403832 or naminc"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <Button type="submit" loading={requestOtp.isPending} className="w-full">
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                OTP has been sent to your Telegram. Check the message from the bot.
              </p>
              <Input
                label="OTP Code"
                placeholder="Enter 6 digits"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                autoFocus
              />
              <Button type="submit" loading={verifyOtp.isPending} className="w-full">
                Verify OTP
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Go back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

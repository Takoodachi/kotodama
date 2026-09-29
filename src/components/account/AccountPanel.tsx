"use client";

import { LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import {
  sendPasswordReset,
  signIn,
  signOut,
  signUp,
  syncNow,
  updatePassword,
  useAccount,
  type ActionResult,
} from "@/store/account";
import { SyncStatusIcon, syncLabel } from "./SyncStatus";

const MIN_PASSWORD = 8;

function TextField(props: React.ComponentProps<"input"> & { label: string }) {
  const { label, className, ...input } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-mist">{label}</span>
      <input
        {...input}
        className={cn(
          "h-12 w-full rounded-xl border border-line bg-white/[0.03] px-4 text-sm text-paper outline-none transition-colors placeholder:text-smoke focus:border-white/30",
          className,
        )}
      />
    </label>
  );
}

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result?.error && !result?.message) return null;
  return (
    <p role="status" className={cn("text-xs leading-relaxed", result.error ? "text-crimson-bright" : "text-gold-bright")}>
      {result.error ?? result.message}
    </p>
  );
}

/** Runs an account action, tracking whether it's in flight and what it said. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = async (action: () => Promise<ActionResult>) => {
    setBusy(true);
    setResult(null);
    const outcome = await action();
    setResult(outcome);
    setBusy(false);
    return outcome;
  };
  return { busy, result, setResult, run };
}

type FormMode = "sign-in" | "sign-up" | "reset";

function SignInForm() {
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, result, setResult, run } = useAction();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "reset") return void run(() => sendPasswordReset(email));
    if (mode === "sign-up" && password.length < MIN_PASSWORD) {
      return setResult({ error: `Use at least ${MIN_PASSWORD} characters for your password.` });
    }
    void run(() => (mode === "sign-in" ? signIn(email, password) : signUp(email, password)));
  };

  const switchTo = (next: FormMode) => {
    setMode(next);
    setResult(null);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode !== "reset" && (
        <SegmentedControl
          label="Account"
          value={mode}
          onChange={switchTo}
          options={[
            { value: "sign-in", label: "Sign in" },
            { value: "sign-up", label: "Create account" },
          ]}
        />
      )}
      {mode === "reset" && (
        <p className="text-sm text-mist">Enter your email and we&apos;ll send a link to choose a new password.</p>
      )}
      <TextField
        label="Email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {mode !== "reset" && (
        <TextField
          label={mode === "sign-up" ? `Password (at least ${MIN_PASSWORD} characters)` : "Password"}
          type="password"
          required
          minLength={mode === "sign-up" ? MIN_PASSWORD : undefined}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      <Feedback result={result} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "One moment…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send link"}
        </Button>
        {mode === "sign-in" && (
          <button type="button" onClick={() => switchTo("reset")} className="text-xs text-mist underline-offset-4 hover:text-paper hover:underline">
            Forgot password?
          </button>
        )}
        {mode === "reset" && (
          <button type="button" onClick={() => switchTo("sign-in")} className="text-xs text-mist underline-offset-4 hover:text-paper hover:underline">
            Back to sign in
          </button>
        )}
      </div>
    </form>
  );
}

function NewPasswordForm() {
  const [password, setPassword] = useState("");
  const { busy, result, setResult, run } = useAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (password.length < MIN_PASSWORD) {
          return setResult({ error: `Use at least ${MIN_PASSWORD} characters for your password.` });
        }
        void run(() => updatePassword(password));
      }}
    >
      <p className="text-sm text-paper">Choose a new password</p>
      <TextField
        label={`New password (at least ${MIN_PASSWORD} characters)`}
        type="password"
        required
        minLength={MIN_PASSWORD}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Feedback result={result} />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}

function SignedIn() {
  const email = useAccount((s) => s.email);
  const sync = useAccount((s) => s.sync);
  const lastSynced = useAccount((s) => s.lastSynced);
  const syncError = useAccount((s) => s.syncError);
  const recovering = useAccount((s) => s.recovering);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const leave = async (force: boolean) => {
    setSigningOut(true);
    const outcome = await signOut({ force });
    setSigningOut(false);
    setConfirmSignOut(!!outcome.unsaved);
  };

  return (
    <div className="space-y-5">
      {recovering && <NewPasswordForm />}
      <div>
        <p className="text-xs text-mist">Signed in as</p>
        <p className="mt-0.5 truncate text-sm text-paper">{email}</p>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
        <SyncStatusIcon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-paper">{syncLabel(sync, lastSynced)}</p>
          {sync === "error" && syncError && <p className="mt-0.5 text-xs text-crimson-bright">{syncError}</p>}
          {sync === "offline" && <p className="mt-0.5 text-xs text-mist">Your progress is safe here and syncs when you&apos;re back online.</p>}
        </div>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={sync === "syncing"}
          aria-label="Sync now"
          title="Sync now"
          className="-my-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-paper disabled:opacity-40"
        >
          <RefreshCw className={cn("size-4", sync === "syncing" && "animate-spin")} />
        </button>
      </div>
      {confirmSignOut ? (
        <div className="space-y-3 rounded-xl border border-crimson/40 px-4 py-3">
          <p className="text-sm text-paper">Your latest progress hasn&apos;t reached your account yet.</p>
          <p className="text-xs leading-relaxed text-mist">
            Signing out now removes it from this device. Try again once you&apos;re online to keep it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setConfirmSignOut(false)}>Stay signed in</Button>
            <Button variant="primary" disabled={signingOut} onClick={() => void leave(true)}>
              {signingOut ? "Signing out…" : "Sign out anyway"}
            </Button>
          </div>
        </div>
      ) : (
        <Button disabled={signingOut} onClick={() => void leave(false)}>
          <LogOut className="size-4" />
          {signingOut ? "Saving your progress…" : "Sign out"}
        </Button>
      )}
    </div>
  );
}

/** Sign in, create an account, and see how syncing is going. */
export function AccountPanel() {
  const status = useAccount((s) => s.status);
  if (status === "unavailable") return null;
  return (
    <section id="account" className="glass scroll-mt-24 rounded-2xl p-5 sm:p-6">
      <p className="eyebrow">Account</p>
      <h2 className="mt-1.5 font-mincho text-2xl text-paper">Sync across devices</h2>
      <p className="mt-1.5 mb-5 text-xs leading-relaxed text-mist">
        {status === "signed-in"
          ? "Your progress is saved to your account and kept the same on every device you sign in on."
          : "Sign in to back up your progress and pick up where you left off on any device. Progress you've made here is kept and added to your account."}
      </p>
      {status === "loading" ? (
        <p className="text-sm text-mist">Checking your account…</p>
      ) : status === "signed-in" ? (
        <SignedIn />
      ) : (
        <SignInForm />
      )}
    </section>
  );
}

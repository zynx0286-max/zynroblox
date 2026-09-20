import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Send, Star } from "lucide-react";
import { captureError } from "@/lib/sentry";
import { createReview } from "@/lib/reviews.functions";

const empty = {
  authorName: "",
  authorEmail: "",
  rating: 5,
  title: "",
  content: "",
  projectRef: "",
  screenshots: "",
};

export function ReviewForm() {
  const submit = useServerFn(createReview);
  const router = useRouter();
  const [values, setValues] = useState(empty);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One review per device: server enforces it by IP/email, this just stops
  // the form early so people get a clear message without a round-trip.
  const [deviceBlocked] = useState(
    () =>
      typeof window !== "undefined" && window.localStorage.getItem("zyn-review-submitted") === "1",
  );

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          authorName: values.authorName,
          authorEmail: values.authorEmail,
          rating: values.rating,
          title: values.title,
          content: values.content,
          ...(values.projectRef ? { projectRef: values.projectRef } : {}),
          screenshotUrls: values.screenshots
            .split(/[\s,]+/)
            .map((u) => u.trim())
            .filter((u) => /^https:\/\//i.test(u))
            .slice(0, 8),
        },
      }),
    onSuccess: () => {
      setDone(true);
      setValues(empty);
      setError(null);
      try {
        window.localStorage.setItem("zyn-review-submitted", "1");
      } catch {
        // Private mode etc. — server-side IP/email check still applies.
      }
      // Refetch the page loader so the new review shows up immediately.
      void router.invalidate();
    },
    onError: (err: unknown) => {
      captureError(err, { area: "reviews" });
      setError(err instanceof Error ? err.message : "Something went wrong submitting your review.");
    },
  });

  const field =
    "mt-1.5 w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm outline-none focus:border-primary/60";
  const label = "font-display text-[0.68rem] tracking-wider text-muted-foreground uppercase";

  // One review per device: the server enforces it by IP/email, this stops
  // the form early with a clear message instead of a round-trip rejection.
  if (deviceBlocked) {
    return (
      <div className="glass-card rounded-[28px] p-6 text-center sm:p-8">
        <p className="font-display text-xl font-bold text-foreground">One review per device</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          This device has already submitted a review. To change it, message @acczyn on Discord.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass-card rounded-[28px] p-6 text-center sm:p-8">
        <p className="font-display text-xl font-bold text-foreground">Thanks for the feedback!</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your review is now live below for everyone to see. Need to change it later? Message
          @acczyn on Discord.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="glass-card rounded-[28px] p-6 sm:p-8"
    >
      <h2 className="font-display text-xl font-bold text-foreground">Leave a review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Worked together? Share your experience — it helps other teams know what to expect.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Name</span>
          <input
            required
            minLength={2}
            maxLength={100}
            className={field}
            placeholder="Your name"
            value={values.authorName}
            onChange={(e) => setValues({ ...values, authorName: e.target.value })}
          />
        </div>
        <div>
          <span className={label}>Email</span>
          <input
            required
            type="email"
            className={field}
            placeholder="you@example.com"
            value={values.authorEmail}
            onChange={(e) => setValues({ ...values, authorEmail: e.target.value })}
          />
        </div>
        <div>
          <span className={label}>Rating</span>
          <div className="mt-1.5 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} stars`}
                onClick={() => setValues({ ...values, rating: n })}
              >
                <Star
                  className={`size-6 transition-colors ${n <= values.rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>Project (optional)</span>
          <input
            maxLength={120}
            className={field}
            placeholder="e.g. Simple Bricks"
            value={values.projectRef}
            onChange={(e) => setValues({ ...values, projectRef: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Title</span>
          <input
            required
            minLength={5}
            maxLength={200}
            className={field}
            placeholder="Short summary of your experience"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Review</span>
          <textarea
            required
            rows={4}
            minLength={20}
            maxLength={5000}
            className={`${field} resize-none`}
            placeholder="What was it like working together?"
            value={values.content}
            onChange={(e) => setValues({ ...values, content: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Screenshot links (optional, https:// — up to 8)</span>
          <input
            type="url"
            multiple
            className={field}
            placeholder="https://… (comma separated)"
            value={values.screenshots}
            onChange={(e) => setValues({ ...values, screenshots: e.target.value })}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Submit review
      </button>
    </form>
  );
}

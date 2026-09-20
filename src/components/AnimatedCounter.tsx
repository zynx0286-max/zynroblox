import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  triggerOnce?: boolean;
  /** Render the final value in server HTML (SEO + no-JS) instead of 0, then
   *  still animate 0 → value once the element scrolls into view. */
  ssrStart?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1500,
  format = (n) => n.toLocaleString(),
  className = "",
  prefix = "",
  suffix = "",
  triggerOnce = true,
  ssrStart = false,
}: AnimatedCounterProps) {
  const numValue = typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : value;
  // ssrStart: the server-rendered HTML carries the real value (crawlers and
  // no-JS visitors see it); the browser then animates 0 → value on reveal.
  const [displayValue, setDisplayValue] = useState(ssrStart ? numValue : 0);
  const [isVisible, setIsVisible] = useState(false);
  const prevValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) observer.unobserve(el);
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerOnce]);

  useEffect(() => {
    if (!isVisible || (triggerOnce && hasAnimatedRef.current)) return;
    if (numValue === prevValueRef.current) return;

    const startValue = prevValueRef.current;
    prevValueRef.current = numValue;
    startTimeRef.current = Date.now();
    hasAnimatedRef.current = true;

    const animate = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (numValue - startValue) * easeOut));

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(animate);
      }
    };

    animationIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [isVisible, numValue, duration, triggerOnce]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {format(displayValue)}
      {suffix}
    </span>
  );
}

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  triggerOnce?: boolean;
}

export function AnimatedCounter({
  value,
  duration = 1500,
  format = (n) => n.toLocaleString(),
  className = "",
  prefix = "",
  suffix = "",
  triggerOnce = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const prevValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);

  const numValue = typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : value;

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

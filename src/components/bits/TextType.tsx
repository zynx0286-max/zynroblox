// Adapted from React Bits `TextType` (MIT, github.com/DavidHDev/react-bits).
// Changes: GSAP cursor blink replaced with a pure-CSS blink (no animation
// library needed), slimmer prop surface, `startOnVisible` defaults to true.

import {
  type ElementType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createElement,
} from "react";

type TextTypeProps = {
  className?: string;
  showCursor?: boolean;
  cursorCharacter?: string;
  cursorClassName?: string;
  text: string | string[];
  as?: ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  startOnVisible?: boolean;
};

export function TextType({
  text,
  as: Component = "span",
  typingSpeed = 55,
  initialDelay = 400,
  pauseDuration = 2200,
  deletingSpeed = 28,
  loop = true,
  className = "",
  showCursor = true,
  cursorCharacter = "|",
  cursorClassName = "",
  textColors = [],
  variableSpeed,
  startOnVisible = true,
  ...props
}: TextTypeProps & React.HTMLAttributes<HTMLElement>) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const containerRef = useRef<HTMLElement | null>(null);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let timeout: ReturnType<typeof setTimeout>;
    const currentText = textArray[currentTextIndex] ?? "";

    if (isDeleting) {
      if (displayedText === "") {
        if (currentTextIndex === textArray.length - 1 && !loop) return;
        setIsDeleting(false);
        setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
        setCurrentCharIndex(0);
        timeout = setTimeout(() => {}, pauseDuration);
      } else {
        timeout = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1));
        }, deletingSpeed);
      }
    } else if (currentCharIndex < currentText.length) {
      timeout = setTimeout(
        () => {
          setDisplayedText((prev) => prev + currentText[currentCharIndex]);
          setCurrentCharIndex((prev) => prev + 1);
        },
        variableSpeed ? getRandomSpeed() : typingSpeed,
      );
    } else if (textArray.length >= 1) {
      if (!loop && currentTextIndex === textArray.length - 1) return;
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    }
    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    variableSpeed,
    getRandomSpeed,
  ]);

  // Kick off the first word after mount (initial delay only applies once).
  useEffect(() => {
    if (!isVisible || displayedText !== "" || currentCharIndex !== 0) return;
    const t = setTimeout(() => {
      const first = textArray[0] ?? "";
      if (first) {
        setDisplayedText(first.slice(0, 1));
        setCurrentCharIndex(1);
      }
    }, initialDelay);
    return () => clearTimeout(t);
  }, [isVisible, displayedText, currentCharIndex, initialDelay, textArray]);

  const color =
    textColors.length > 0
      ? (textColors[currentTextIndex % textColors.length] ?? "inherit")
      : "inherit";

  return createElement(
    Component,
    {
      ref: containerRef,
      className: `inline-block whitespace-pre-wrap ${className}`,
      ...props,
    },
    <span className="inline" style={{ color }}>
      {displayedText}
    </span>,
    showCursor ? (
      <span aria-hidden className={`zyn-text-cursor ${cursorClassName}`}>
        {cursorCharacter}
      </span>
    ) : null,
  );
}

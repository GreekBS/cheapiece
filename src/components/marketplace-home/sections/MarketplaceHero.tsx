"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { homeHeroSlides } from "../marketplace-home-data";

const AUTO_MS = 6200;

function IconChevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {dir === "left" ? <path d="M15 6 9 12l6 6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function MarketplaceHero() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const len = homeHeroSlides.length;

  const go = useCallback(
    (next: number) => {
      setIndex((next + len) % len);
    },
    [len],
  );

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(() => {
      setIndex((p) => (p + 1) % len);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, len]);

  const activeSlide = homeHeroSlides[index] ?? homeHeroSlides[0];
  const dotsOnDark = activeSlide.theme === "dark";

  return (
    <section
      className="relative border-b border-slate-200/80 bg-slate-100 pt-5 sm:pt-6 lg:pt-8 pb-6 sm:pb-8 lg:pb-10"
      aria-roledescription="carousel"
      aria-label="Προωθητικές προτάσεις"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-200 shadow-[0_14px_44px_-14px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/[0.035]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                width: `${len * 100}%`,
                transform: `translate3d(-${(index * 100) / len}%,0,0)`,
              }}
            >
              {homeHeroSlides.map((slide, slideIndex) => {
                const isDark = slide.theme === "dark";
                return (
                  <article
                    key={slide.id}
                    className="relative shrink-0"
                    style={{ width: `${100 / len}%` }}
                    aria-hidden={slideIndex !== index}
                  >
                    <div className="relative h-[200px] w-full bg-slate-200 sm:h-[248px] md:h-[300px] lg:h-[420px] xl:h-[480px]">
                      <Image
                        src={slide.bannerSrc}
                        alt=""
                        fill
                        priority={slideIndex === 0}
                        sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 896px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
                        className="object-cover"
                        style={{ objectPosition: slide.objectPosition }}
                      />
                      <div
                        className={
                          isDark
                            ? "absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/65 to-slate-900/25 md:via-slate-900/45 md:to-transparent"
                            : "absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-white/20 md:from-white/92 md:via-white/55 md:to-transparent"
                        }
                        aria-hidden
                      />
                      <div className="absolute inset-0 z-10 flex items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                        <div className="mx-auto flex w-full max-w-7xl flex-col justify-center">
                          <div className="max-w-xl text-center lg:text-left">
                            <p
                              className={
                                isDark
                                  ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90 sm:text-xs"
                                  : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs"
                              }
                            >
                              Tsipis · marketplace
                            </p>
                            <h1
                              className={
                                isDark
                                  ? "mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]"
                                  : "mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]"
                              }
                            >
                              {slide.title}
                            </h1>
                            <p
                              className={
                                isDark
                                  ? "mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0"
                                  : "mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0"
                              }
                            >
                              {slide.subtitle}
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-8 lg:justify-start">
                              <Link
                                href={slide.href}
                                className={
                                  isDark
                                    ? "inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-semibold text-slate-900 shadow-md shadow-black/20 transition duration-200 hover:bg-cyan-50"
                                    : "inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 px-7 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition duration-200 hover:from-slate-900 hover:to-slate-950"
                                }
                              >
                                {slide.cta}
                              </Link>
                              <Link
                                href="/offers"
                                className={
                                  isDark
                                    ? "inline-flex h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-white/40 hover:bg-white/15"
                                    : "inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 px-6 text-sm font-semibold text-slate-800 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-white"
                                }
                              >
                                Όλες οι προσφορές
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-2 sm:px-3">
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="hidden translate-x-1 rounded-full border border-slate-200/90 bg-white/90 p-2.5 text-slate-700 opacity-0 shadow-sm backdrop-blur-md transition-all duration-300 ease-out pointer-events-none hover:bg-white hover:text-slate-900 motion-reduce:translate-x-0 sm:flex sm:group-hover:pointer-events-auto sm:group-hover:translate-x-0 sm:group-hover:opacity-100"
                aria-label="Προηγούμενο banner"
              >
                <IconChevron dir="left" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="hidden -translate-x-1 rounded-full border border-slate-200/90 bg-white/90 p-2.5 text-slate-700 opacity-0 shadow-sm backdrop-blur-md transition-all duration-300 ease-out pointer-events-none hover:bg-white hover:text-slate-900 motion-reduce:translate-x-0 sm:flex sm:group-hover:pointer-events-auto sm:group-hover:translate-x-0 sm:group-hover:opacity-100"
                aria-label="Επόμενο banner"
              >
                <IconChevron dir="right" />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent pt-10 pb-3.5 sm:pt-12 sm:pb-4">
              <div className="pointer-events-auto flex justify-center gap-2">
                {homeHeroSlides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => go(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      dotsOnDark
                        ? i === index
                          ? "w-8 bg-white shadow-sm ring-1 ring-white/30"
                          : "w-2.5 bg-white/45 hover:bg-white/70"
                        : i === index
                          ? "w-8 bg-slate-800 shadow-sm"
                          : "w-2.5 bg-slate-500/45 hover:bg-slate-500/70"
                    }`}
                    aria-label={`Banner ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            ← Προηγ.
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="rounded-full border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm"
          >
            Επόμ. →
          </button>
        </div>
      </div>
    </section>
  );
}

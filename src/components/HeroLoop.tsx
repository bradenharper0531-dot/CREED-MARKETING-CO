import React, { useEffect, useRef, useState } from 'react';

/* The 3D Creed mark. On load, /creed-intro.mp4 plays once: molten gold pours
   out from the centre along both C's, smoke and embers boil off, and it cools
   into the polished ribbon. Its last frame is the frame just before
   /creed-loop.mp4 starts, so the hand-off to the 8-second turning loop has no
   visible join (the intro stays on top until the loop is actually playing).
   With reduced motion on, the intro is skipped and the finished mark holds
   still. Both clips come from tools/hero-loop.html — re-render them with
   `python3 tools/render-loop.py`. */

const LAYER = [
  'absolute inset-0 h-full w-full object-cover object-[76%_center]',
  // phones: a dim backdrop behind the copy; laptops: shrink toward the right edge so the
  // mark clears the headline; big screens: full size
  'opacity-35 lg:opacity-100 origin-right lg:scale-[0.66] xl:scale-[0.76] 2xl:scale-100',
  // soft edges — fade out top, bottom and left so the frame never shows as a box at any size
  '[mask-image:linear-gradient(to_bottom,transparent,#000_22%,#000_80%,transparent),linear-gradient(to_right,transparent,#000_30%)]',
  '[mask-composite:intersect] [-webkit-mask-composite:source-in]',
].join(' ');

export function HeroLoop() {
  const intro = useRef<HTMLVideoElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const iv = intro.current;
    const lv = loop.current;
    if (!iv || !lv) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let handedOff = false;

    const startLoop = () => {
      if (handedOff) return;
      handedOff = true;
      lv.currentTime = 0;
      lv.play()
        .catch(() => {
          /* autoplay blocked — the poster (same frame) still shows */
        })
        .finally(() => setIntroDone(true));
    };

    if (mq.matches) {
      handedOff = true;
      setIntroDone(true);
      lv.pause();
      lv.currentTime = 0;
    } else {
      iv.play().catch(startLoop); // if the intro can't play, go straight to the mark
    }

    const onMotion = () => {
      if (mq.matches) {
        iv.pause();
        lv.pause();
        handedOff = true;
        setIntroDone(true);
      } else if (handedOff) {
        lv.play().catch(() => {});
      }
    };
    iv.addEventListener('ended', startLoop);
    iv.addEventListener('error', startLoop);
    mq.addEventListener('change', onMotion);
    return () => {
      iv.removeEventListener('ended', startLoop);
      iv.removeEventListener('error', startLoop);
      mq.removeEventListener('change', onMotion);
    };
  }, []);

  return (
    <>
      <video ref={loop} aria-hidden="true" loop muted playsInline preload="auto" poster="/creed-loop.jpg" className={LAYER}>
        <source src="/creed-loop.mp4" type="video/mp4" />
      </video>
      {!introDone && (
        <video ref={intro} aria-hidden="true" muted playsInline preload="auto" className={LAYER}>
          <source src="/creed-intro.mp4" type="video/mp4" />
        </video>
      )}
    </>
  );
}

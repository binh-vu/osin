import { RefObject, useEffect, useState } from "react";

/**
 * Hook that returns the remaining height of the window from the top of the ref element.
 */
export function useRemainingHeight(
  ref: RefObject<HTMLDivElement>,
  initialHeight: number
) {
  const [windowHeight, setWindowHeight] = useState<number>(initialHeight);
  const [remainHeight, setRemainHeight] = useState<number>(initialHeight);

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowHeight(window.innerHeight);
    }
    // Add event listener
    window.addEventListener("resize", handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  useEffect(() => {
    // console.log("calculate remaining height");
    if (ref.current !== null) {
      const newRemainHeight =
        window.innerHeight - Math.ceil(ref.current.getBoundingClientRect().top);
      if (newRemainHeight !== remainHeight) {
        setRemainHeight(newRemainHeight);
      }
    }
  }, [ref, windowHeight]);

  return remainHeight;
}

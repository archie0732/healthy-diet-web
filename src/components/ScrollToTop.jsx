import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    const scrollContainers = document.querySelectorAll('main, .overflow-y-auto, #root > div');

    scrollContainers.forEach(container => {
      container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });

  }, [pathname]);

  return null;
};

export default ScrollToTop;

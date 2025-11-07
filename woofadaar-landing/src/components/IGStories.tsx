'use client';

import { motion } from 'framer-motion';
import { Instagram, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// Instagram post data
const instagramPosts = [
  { id: 'DP5466jiI8X', url: 'https://www.instagram.com/p/DP5466jiI8X/' },
  { id: 'DPfxsGnCI3b', url: 'https://www.instagram.com/p/DPfxsGnCI3b/' },
  { id: 'DNkbDlwoZVw', url: 'https://www.instagram.com/p/DNkbDlwoZVw/' },
  { id: 'DLEjuypRB-B', url: 'https://www.instagram.com/p/DLEjuypRB-B/' },
  { id: 'DM7bss4pGrx', url: 'https://www.instagram.com/p/DM7bss4pGrx/' },
  { id: 'DO-x8YRCWK8', url: 'https://www.instagram.com/p/DO-x8YRCWK8/' }
];

export default function IGStories() {
  const sliderRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadedPosts, setLoadedPosts] = useState<Set<string>>(new Set());

  // Carousel settings
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 2,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: false,
    swipe: true,
    draggable: true,
    touchMove: true,
    accessibility: true,
    centerMode: false,
    variableWidth: false,
    beforeChange: (current: number, next: number) => {
      setIsDragging(true);
      setCurrentSlide(next);
      // Load all posts
      const toLoad = new Set<string>();
      instagramPosts.forEach(post => {
        toLoad.add(post.id);
      });
      setLoadedPosts(toLoad);
    },
    afterChange: () => setIsDragging(false),
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2, slidesToScroll: 1, centerMode: false, variableWidth: false, swipe: true, draggable: true, touchMove: true } },
      { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 1, centerMode: false, variableWidth: false, infinite: true, swipe: true, draggable: true, touchMove: true } },
      { breakpoint: 640, settings: { slidesToShow: 2, slidesToScroll: 1, centerMode: false, variableWidth: false, swipe: true, draggable: true, touchMove: true } },
      { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 1, centerMode: false, variableWidth: false, swipe: true, draggable: true, touchMove: true } }
    ]
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sliderRef.current && !isDragging) {
      sliderRef.current.slickPrev();
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sliderRef.current && !isDragging) {
      sliderRef.current.slickNext();
    }
  };

  // Initialize all posts
  useEffect(() => {
    const initialLoad = new Set<string>();
    instagramPosts.forEach(post => {
      initialLoad.add(post.id);
    });
    setLoadedPosts(initialLoad);
  }, []);

  return (
    <>
      <style jsx global>{`
        @media (max-width: 767px) {
          .instagram-carousel .slick-track {
            display: flex !important;
          }

          .instagram-carousel .slick-slide {
            /* Don't force width - use padding for gaps */
            padding: 0 8px !important;
            box-sizing: border-box !important;
          }

          .instagram-carousel .slick-slide > div {
            width: 100% !important;
          }

          .instagram-carousel .slick-list {
            overflow: hidden !important;
            margin: 0 -8px !important; /* Compensate for padding */
          }
        }
      `}</style>

      <section className="py-16 sm:py-16 md:py-20 lg:py-24 bg-neutral-milkWhite">
        <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-16 px-6"
        >
          <h2 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-mutedPurple mb-0 md:mb-6 font-sans leading-tight">
            REAL STORIES.<br />REAL PARENTS.
          </h2>
          <p className="hidden md:block text-lg sm:text-2xl md:text-3xl lg:text-4xl text-primary-mutedPurple max-w-4xl mx-auto px-2 leading-relaxed">
            Honest stories & unfiltered love that makes your heart wag.
          </p>
        </motion.div>

        {/* Instagram Posts Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-8 sm:mb-10 md:mb-12"
        >
          <div className="relative">
            {/* Custom Navigation Arrows */}
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6 text-primary-mutedPurple" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-all"
              style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6 text-primary-mutedPurple" />
            </button>

            {/* Slider */}
            <div className="instagram-carousel overflow-hidden relative">
              <Slider ref={sliderRef} {...settings}>
                {instagramPosts.map((post, index) => (
                  <div key={post.id}>
                    <InstagramIframeEmbed
                      post={post}
                      shouldLoad={loadedPosts.has(post.id)}
                      priority={index < 3}
                    />
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </motion.div>

        {/* Read Woof Stories CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center relative z-50 px-6"
        >
          <a
            href="https://www.instagram.com/woofadaarofficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 sm:gap-3 bg-primary-mutedPurple text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 min-h-[48px]"
          >
            <Instagram className="w-5 h-5 sm:w-6 sm:h-6" />
            Follow Our Journey
          </a>
        </motion.div>
      </div>
    </section>
    </>
  );
}

// Instagram iframe embed component
interface InstagramIframeEmbedProps {
  post: { id: string; url: string };
  shouldLoad: boolean;
  priority?: boolean;
}

function InstagramIframeEmbed({
  post,
  shouldLoad,
  priority = false
}: InstagramIframeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Create iframe URL with parameters (without captions)
  const iframeUrl = `${post.url}embed/?cr=1&v=14&wp=540&rd=https%3A%2F%2Fwoofadaar.com&rp=%2F`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!shouldLoad || priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && iframeRef.current) {
            const iframe = iframeRef.current;
            if (!iframe.src) {
              iframe.src = iframeUrl;
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (iframeRef.current) {
      observer.observe(iframeRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLoad, iframeUrl, priority]);

  if (hasError) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center flex flex-col items-center justify-center" style={{ minHeight: '500px' }}>
        <Instagram className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600 mb-4">Unable to load Instagram post</p>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-mutedPurple hover:text-primary-darkPurple underline font-semibold"
        >
          View on Instagram →
        </a>
      </div>
    );
  }

  return (
    <div className="instagram-iframe-container relative bg-white rounded-xl shadow-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-mutedPurple mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading Instagram post...</p>
          </div>
        </div>
      )}

      {shouldLoad && (
        <iframe
          ref={iframeRef}
          src={priority ? iframeUrl : undefined}
          className="w-full"
          style={{
            minHeight: '500px',
            maxHeight: '620px',
            border: '0',
            visibility: isLoading ? 'hidden' : 'visible'
          }}
          scrolling="no"
          allowTransparency
          allowFullScreen
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          title={`Instagram Post ${post.id}`}
        />
      )}
    </div>
  );
}

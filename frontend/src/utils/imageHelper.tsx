/**
 * Image Optimization Helper
 * Utilities for lazy loading images and optimizing image delivery
 */

import React, { useState, useEffect, useRef } from 'react';

/**
 * Lazy Image Component
 * Loads image only when it enters the viewport
 * 
 * @example
 * <LazyImage 
 *   src="/images/policy-banner.jpg" 
 *   alt="Policy Banner"
 *   placeholder="/images/placeholder.jpg"
 * />
 */

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = '',
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  style = {},
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load image immediately
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isInView && !isLoaded) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
    }
  }, [isInView, src, isLoaded]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`lazy-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      style={{
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.6,
        ...style,
      }}
      loading="lazy"
      {...props}
    />
  );
};

/**
 * Get optimized image URL with size parameters
 * For use with CDN or image optimization services
 * 
 * @example
 * getOptimizedImageUrl('/images/policy.jpg', { width: 800, format: 'webp' })
 */
interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
}

export const getOptimizedImageUrl = (
  url: string,
  options: ImageOptimizationOptions = {}
): string => {
  // If using a CDN with image optimization, construct the URL
  // Example for Cloudinary, Imgix, or similar services
  
  const params = new URLSearchParams();
  
  if (options.width) params.append('w', options.width.toString());
  if (options.height) params.append('h', options.height.toString());
  if (options.quality) params.append('q', options.quality.toString());
  if (options.format) params.append('f', options.format);

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

/**
 * Responsive Image Component
 * Automatically selects appropriate image size based on screen width
 * 
 * @example
 * <ResponsiveImage 
 *   src="/images/policy-banner.jpg"
 *   alt="Policy Banner"
 *   sizes="(max-width: 768px) 100vw, 50vw"
 * />
 */

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  widths?: number[];
  sizes?: string;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  widths = [320, 640, 768, 1024, 1280, 1920],
  sizes = '100vw',
  className = '',
  ...props
}) => {
  // Generate srcset for different image sizes
  const srcSet = widths
    .map((width) => `${getOptimizedImageUrl(src, { width })} ${width}w`)
    .join(', ');

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading="lazy"
      {...props}
    />
  );
};

/**
 * Background Image with Lazy Loading
 * For div backgrounds that should be lazy loaded
 * 
 * @example
 * <LazyBackgroundImage 
 *   src="/images/hero-bg.jpg"
 *   className="hero-section"
 * >
 *   <h1>Welcome</h1>
 * </LazyBackgroundImage>
 */

interface LazyBackgroundImageProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const LazyBackgroundImage: React.FC<LazyBackgroundImageProps> = ({
  src,
  className = '',
  style = {},
  children,
}) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('none');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setBackgroundImage(`url(${src})`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setBackgroundImage(`url(${src})`);
              setIsLoaded(true);
            };
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  return (
    <div
      ref={divRef}
      className={`lazy-background ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      style={{
        ...style,
        backgroundImage,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoaded ? 1 : 0.8,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Preload critical images
 * Call this in your main App component for above-the-fold images
 * 
 * @example
 * preloadImages(['/images/logo.png', '/images/hero.jpg'])
 */
export const preloadImages = (imageUrls: string[]): void => {
  if (typeof window === 'undefined') return;

  imageUrls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Check if image format is supported by browser
 */
export const supportsImageFormat = async (format: 'webp' | 'avif'): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const formats: Record<string, string> = {
    webp: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
    avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=',
  };

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = formats[format];
  });
};

/**
 * Get best image format based on browser support
 */
export const getBestImageFormat = async (): Promise<'avif' | 'webp' | 'jpeg'> => {
  if (await supportsImageFormat('avif')) return 'avif';
  if (await supportsImageFormat('webp')) return 'webp';
  return 'jpeg';
};

export default {
  LazyImage,
  ResponsiveImage,
  LazyBackgroundImage,
  getOptimizedImageUrl,
  preloadImages,
  supportsImageFormat,
  getBestImageFormat,
};

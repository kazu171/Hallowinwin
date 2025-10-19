import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

const defaultFallback = '/placeholder-image.svg';

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ fallbackSrc = defaultFallback, onError, ...props }) => {
  const [errored, setErrored] = useState(false);

  return (
    <img
      {...props}
      onError={(e) => {
        if (!errored) {
          setErrored(true);
          (e.target as HTMLImageElement).src = fallbackSrc;
        }
        onError?.(e);
      }}
      loading={props.loading ?? 'lazy'}
      decoding={props.decoding ?? 'async'}
    />
  );
};

export default ImageWithFallback;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImageViewerProps {
  src: string;
  alt: string;
  title?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, title }) => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{title || 'Image Viewer'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <img 
            src={src} 
            alt={alt}
            className="max-w-full h-auto rounded-lg shadow-lg"
            style={{ maxHeight: '80vh' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageViewer;
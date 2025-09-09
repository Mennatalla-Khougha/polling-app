'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QRCodeCardProps {
  title?: string;
  description?: string;
  value: string;
  size?: number;
}

export function QRCodeCard({ title = 'Share via QR Code', description = 'Scan to open this poll on any device', value, size = 240 }: QRCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 }, (error) => {
      if (error) console.error('Failed to render QR code:', error);
    });
  }, [value, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'poll-qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <canvas ref={canvasRef} width={size} height={size} className="rounded bg-white p-2 shadow-sm" />
        <Button onClick={handleDownload} className="w-full">Download QR</Button>
      </CardContent>
    </Card>
  );
}

export default QRCodeCard;



import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  RefreshCw,
  Flashlight,
  Upload,
  Search,
  AlertCircle,
  Plus,
  QrCode,
  Wrench,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Asset } from '../hooks/useAssets';
import { Ticket } from '../hooks/useTickets';
import { resolveQrMatch, parseQrPayload } from '../lib/qr';
import { db, doc, getDoc } from '../lib/firebase';
import { useStore } from '../store/useStore';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  tickets: Ticket[];
  onOpenAsset: (asset: Asset) => void;
  onOpenTicket: (ticket: Ticket) => void;
  onRegisterNewAsset?: (qrCodeValue: string) => void;
}

export function QrScannerModal({
  isOpen,
  onClose,
  assets,
  tickets,
  onOpenAsset,
  onOpenTicket,
  onRegisterNewAsset,
}: QrScannerModalProps) {
  const { user } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScanCheckRef = useRef<number>(0);
  const invertToggleRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'denied' | 'unavailable'>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [preferTicketOnScan, setPreferTicketOnScan] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [unmatchedQr, setUnmatchedQr] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchEnabled(false);
    setTorchSupported(false);
  }, []);

  const handleDecodedValue = useCallback(
    async (rawValue: string) => {
      const cleaned = rawValue.trim();
      if (!cleaned) return;

      const localMatch = resolveQrMatch(cleaned, assets, tickets);

      if (localMatch.type === 'ticket') {
        stopCamera();
        onOpenTicket(localMatch.ticket);
        onClose();
        return;
      }

      if (localMatch.type === 'asset') {
        stopCamera();
        if (preferTicketOnScan && localMatch.linkedTicket) {
          onOpenTicket(localMatch.linkedTicket);
        } else {
          onOpenAsset(localMatch.asset);
        }
        onClose();
        return;
      }

      // Direct Firestore doc fallback if valid ID and not in current listener snapshot
      const parsed = parseQrPayload(cleaned);
      if (parsed.identifier && /^[a-zA-Z0-9_-]{3,128}$/.test(parsed.identifier)) {
        try {
          if (parsed.kind === 'ticket' || parsed.kind === 'unknown') {
            const ticketSnap = await getDoc(doc(db, 'tickets', parsed.identifier));
            if (ticketSnap.exists()) {
              const data = ticketSnap.data();
              if (!user?.orgCode || data.orgCode === user.orgCode) {
                const fetchedTicket = { id: ticketSnap.id, ...data } as Ticket;
                stopCamera();
                onOpenTicket(fetchedTicket);
                onClose();
                return;
              }
            }
          }
          if (parsed.kind === 'asset' || parsed.kind === 'unknown') {
            const assetSnap = await getDoc(doc(db, 'assets', parsed.identifier));
            if (assetSnap.exists()) {
              const data = assetSnap.data();
              if (!user?.orgCode || data.orgCode === user.orgCode) {
                const fetchedAsset = { id: assetSnap.id, ...data } as Asset;
                stopCamera();
                onOpenAsset(fetchedAsset);
                onClose();
                return;
              }
            }
          }
        } catch {
          // Permission denied or non-existent ID -> treat as unregistered QR tag below
        }
      }

      // Pause live loop slightly by showing unmatched card so user can register it or rescan
      setUnmatchedQr(cleaned);
      setStatusMessage(null);
    },
    [assets, tickets, preferTicketOnScan, onOpenAsset, onOpenTicket, onClose, stopCamera, user?.orgCode]
  );

  const scanFrame = useCallback(
    (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && timestamp - lastScanCheckRef.current >= 110) {
        lastScanCheckRef.current = timestamp;
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            invertToggleRef.current = !invertToggleRef.current;
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: invertToggleRef.current ? 'attemptBoth' : 'dontInvert',
            });

            if (code?.data) {
              void handleDecodedValue(code.data);
              return;
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    },
    [handleDecodedValue]
  );

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState('starting');
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setCameraError('Camera streaming is unavailable in this browser. Upload a QR photo or enter a code below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(Boolean(caps?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('active');
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError('Camera access was blocked. Allow camera permissions or upload a photo of the equipment QR label.');
      } else {
        setCameraState('unavailable');
        setCameraError('No active camera detected on this device. Upload a QR photo or enter an asset tag below.');
      }
    }
  }, [facingMode, scanFrame, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setUnmatchedQr(null);
      setStatusMessage(null);
      setManualQuery('');
      return;
    }

    void startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const nextState = !torchEnabled;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as MediaTrackConstraintSet],
      });
      setTorchEnabled(nextState);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code?.data) {
          void handleDecodedValue(code.data);
        } else {
          setStatusMessage('No QR code detected in that photo. Try a sharper, well-lit angle.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setUnmatchedQr(null);
    void handleDecodedValue(manualQuery.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Scan Equipment QR</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Point camera at an equipment tag or work order QR code
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`h-full w-full object-cover ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder corners when camera is active */}
            {cameraState === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-52 w-52">
                  <span className="absolute left-0 top-0 h-7 w-7 border-l-2 border-t-2 border-white rounded-tl-lg" />
                  <span className="absolute right-0 top-0 h-7 w-7 border-r-2 border-t-2 border-white rounded-tr-lg" />
                  <span className="absolute left-0 bottom-0 h-7 w-7 border-l-2 border-b-2 border-white rounded-bl-lg" />
                  <span className="absolute right-0 bottom-0 h-7 w-7 border-r-2 border-b-2 border-white rounded-br-lg" />
                </div>
              </div>
            )}

            {/* Top camera controls */}
            {cameraState === 'active' && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-xl text-xs font-bold backdrop-blur-md transition-colors ${
                      torchEnabled
                        ? 'bg-amber-400 text-neutral-950'
                        : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="p-2.5 rounded-xl bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
                  title="Switch Camera"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Loading / Error overlays */}
            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <p className="text-xs font-medium text-white/80">Initializing device camera...</p>
              </div>
            )}

            {(cameraState === 'denied' || cameraState === 'unavailable') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white p-6 text-center bg-neutral-900">
                <Camera className="h-9 w-9 text-neutral-400" />
                <p className="text-xs text-neutral-300 max-w-xs leading-relaxed">{cameraError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="px-4 py-2 rounded-xl bg-white text-neutral-900 text-xs font-bold active:scale-95"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-white text-xs font-bold border border-neutral-700 active:scale-95"
                  >
                    Upload QR Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scan behavior + Upload Photo row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={preferTicketOnScan}
                onChange={(e) => setPreferTicketOnScan(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Open active maintenance ticket directly when linked
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Scan from Photo
            </button>
          </div>

          {statusMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Unregistered QR code prompt */}
          {unmatchedQr && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    Unregistered QR Code Detected
                  </p>
                  <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 break-all mt-0.5">
                    {unmatchedQr}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUnmatchedQr(null);
                    if (cameraState === 'active' && rafRef.current === null) {
                      rafRef.current = requestAnimationFrame(scanFrame);
                    }
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                >
                  Rescan
                </button>
              </div>
              {onRegisterNewAsset && (
                <button
                  type="button"
                  onClick={() => {
                    const code = unmatchedQr;
                    stopCamera();
                    onClose();
                    onRegisterNewAsset(code);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-xs font-bold active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Register New Equipment with This QR
                </button>
              )}
            </div>
          )}

          {/* Manual Tag / Ticket Lookup */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Manual Tag, Serial, or Ticket ID Lookup
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="e.g. EQ-HVAC-01 or fieldtech://asset/..."
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-9 pr-3 py-2.5 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                />
              </div>
              <button
                type="submit"
                disabled={!manualQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold disabled:opacity-40 whitespace-nowrap"
              >
                Open
              </button>
            </div>
          </form>

          {/* Quick Reference Stats */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 tabular-nums pt-1">
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              {assets.length} Equipment Assets Indexed
            </span>
            <span className="flex items-center gap-1.5">
              <TicketIcon className="h-3.5 w-3.5" />
              {tickets.length} Work Orders Indexed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

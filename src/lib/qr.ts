import { Asset } from '../hooks/useAssets';
import { Ticket } from '../hooks/useTickets';

export type ParsedQrTarget =
  | { kind: 'asset'; identifier: string; raw: string }
  | { kind: 'ticket'; identifier: string; raw: string }
  | { kind: 'unknown'; identifier: string; raw: string };

export type ResolvedQrMatch =
  | { type: 'asset'; asset: Asset; linkedTicket?: Ticket; raw: string }
  | { type: 'ticket'; ticket: Ticket; linkedAsset?: Asset; raw: string }
  | { type: 'not-found'; parsed: ParsedQrTarget; raw: string };

export function buildAssetQrValue(assetId: string): string {
  return `fieldtech://asset/${assetId}`;
}

export function buildTicketQrValue(ticketId: string): string {
  return `fieldtech://ticket/${ticketId}`;
}

export function parseQrPayload(rawValue: string): ParsedQrTarget {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { kind: 'unknown', identifier: '', raw: rawValue };
  }

  // 1. JSON payload: { type: "asset" | "ticket", id: "..." }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const id = String(parsed.id || parsed.assetId || parsed.ticketId || parsed.tag || '').trim();
      if (parsed.type === 'ticket' || parsed.ticketId) {
        return { kind: 'ticket', identifier: id, raw: trimmed };
      }
      if (parsed.type === 'asset' || parsed.assetId || parsed.tag) {
        return { kind: 'asset', identifier: id, raw: trimmed };
      }
    } catch {
      // Fall through to URI/text parsing
    }
  }

  // 2. Deep-link / URL patterns: fieldtech://asset/:id, fieldtech://ticket/:id, https://.../asset/:id
  const assetUriMatch = trimmed.match(/(?:fieldtech:\/\/|https?:\/\/[^/]+\/)assets?\/([a-zA-Z0-9_-]+)/i);
  if (assetUriMatch?.[1]) {
    return { kind: 'asset', identifier: assetUriMatch[1], raw: trimmed };
  }

  const ticketUriMatch = trimmed.match(/(?:fieldtech:\/\/|https?:\/\/[^/]+\/)tickets?\/([a-zA-Z0-9_-]+)/i);
  if (ticketUriMatch?.[1]) {
    return { kind: 'ticket', identifier: ticketUriMatch[1], raw: trimmed };
  }

  // 3. Query params ?assetId=... or ?ticketId=...
  try {
    if (trimmed.includes('://')) {
      const url = new URL(trimmed);
      const qAsset = url.searchParams.get('assetId') || url.searchParams.get('asset');
      if (qAsset) return { kind: 'asset', identifier: qAsset.trim(), raw: trimmed };
      const qTicket = url.searchParams.get('ticketId') || url.searchParams.get('ticket');
      if (qTicket) return { kind: 'ticket', identifier: qTicket.trim(), raw: trimmed };
    }
  } catch {
    // Ignore malformed URLs
  }

  // 4. Prefixed labels: ASSET:XYZ, EQ:XYZ, TICKET:XYZ, WO:XYZ
  if (/^(?:ASSET|EQ):/i.test(trimmed)) {
    return { kind: 'asset', identifier: trimmed.replace(/^(?:ASSET|EQ):/i, '').trim(), raw: trimmed };
  }
  if (/^(?:TICKET|WO):/i.test(trimmed)) {
    return { kind: 'ticket', identifier: trimmed.replace(/^(?:TICKET|WO):/i, '').trim(), raw: trimmed };
  }

  // 5. Generic string (could be asset doc ID, assetTag, qrCode string, serialNumber, or ticket ID)
  return { kind: 'unknown', identifier: trimmed, raw: trimmed };
}

export function resolveQrMatch(
  rawValue: string,
  assets: Asset[],
  tickets: Ticket[]
): ResolvedQrMatch {
  const parsed = parseQrPayload(rawValue);
  const needle = parsed.identifier.toLowerCase();
  const rawLower = parsed.raw.toLowerCase();

  const findAsset = (term: string) =>
    assets.find(
      (a) =>
        a.id.toLowerCase() === term ||
        (a.assetTag && a.assetTag.toLowerCase() === term) ||
        (a.qrCode && (a.qrCode.toLowerCase() === term || a.qrCode.toLowerCase() === rawLower)) ||
        (a.serialNumber && a.serialNumber.toLowerCase() === term)
    );

  const findTicket = (term: string) =>
    tickets.find((t) => t.id.toLowerCase() === term);

  if (parsed.kind === 'ticket') {
    const ticket = findTicket(needle);
    if (ticket) {
      const linkedAsset = ticket.assetId ? assets.find((a) => a.id === ticket.assetId) : undefined;
      return { type: 'ticket', ticket, linkedAsset, raw: rawValue };
    }
  }

  if (parsed.kind === 'asset') {
    const asset = findAsset(needle);
    if (asset) {
      const linkedTicket =
        (asset.linkedTicketId ? tickets.find((t) => t.id === asset.linkedTicketId) : undefined) ||
        tickets.find((t) => t.assetId === asset.id && t.status !== 'closed' && t.status !== 'resolved');
      return { type: 'asset', asset, linkedTicket, raw: rawValue };
    }
  }

  // Unknown kind or fallback cross-search
  const fallbackAsset = findAsset(needle) || findAsset(rawLower);
  if (fallbackAsset) {
    const linkedTicket =
      (fallbackAsset.linkedTicketId
        ? tickets.find((t) => t.id === fallbackAsset.linkedTicketId)
        : undefined) ||
      tickets.find((t) => t.assetId === fallbackAsset.id && t.status !== 'closed' && t.status !== 'resolved');
    return { type: 'asset', asset: fallbackAsset, linkedTicket, raw: rawValue };
  }

  const fallbackTicket = findTicket(needle);
  if (fallbackTicket) {
    const linkedAsset = fallbackTicket.assetId
      ? assets.find((a) => a.id === fallbackTicket.assetId)
      : undefined;
    return { type: 'ticket', ticket: fallbackTicket, linkedAsset, raw: rawValue };
  }

  return { type: 'not-found', parsed, raw: rawValue };
}

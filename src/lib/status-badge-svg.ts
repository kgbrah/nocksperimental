// Self-contained, dependency-free shields-style flat SVG badge generator. Used by the
// embeddable launch-evidence badge endpoint so NockApp builders can display verification
// status in their own READMEs (e.g. ![](https://nocksperimental.com/api/launch-evidence/<id>/badge.svg)).

const STATUS_COLORS: Record<string, string> = {
  verified: "#2ea44f",
  watch: "#dbab09",
  blocked: "#cb2431",
  unknown: "#6a737d"
};

export function colorForStatus(status: string): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Approximate Verdana 11px advance width; close enough for a tidy flat badge.
function sectionWidth(text: string): number {
  return Math.max(text.length * 7 + 10, 30);
}

/**
 * Render a flat "shields"-style status badge as an SVG string. Crisp text via the
 * standard scale(0.1) trick, with a subtle drop shadow and rounded corners.
 */
export function renderStatusBadgeSvg(label: string, message: string, color: string): string {
  const labelW = sectionWidth(label);
  const messageW = sectionWidth(message);
  const totalW = labelW + messageW;
  const labelCenter = (labelW / 2) * 10;
  const messageCenter = (labelW + messageW / 2) * 10;
  const labelXml = escapeXml(label);
  const messageXml = escapeXml(message);
  const ariaLabel = escapeXml(`${label}: ${message}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${ariaLabel}">
  <title>${ariaLabel}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${messageW}" height="20" fill="${color}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110">
    <text x="${labelCenter}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${labelXml}</text>
    <text x="${labelCenter}" y="140" transform="scale(.1)">${labelXml}</text>
    <text x="${messageCenter}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${messageXml}</text>
    <text x="${messageCenter}" y="140" transform="scale(.1)">${messageXml}</text>
  </g>
</svg>`;
}

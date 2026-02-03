import { QRCodeSVG } from 'qrcode.react'

interface TicketQRCodeProps {
  token: string
  size?: number
}

/**
 * TicketQRCode Component
 * 
 * Displays a QR code for ticket validation.
 * Uses high contrast (black on white) for reliable scanning.
 * 
 * @param token - The QR token string to encode
 * @param size - Size in pixels (default: 200)
 */
export function TicketQRCode({ token, size = 200 }: TicketQRCodeProps) {
  return (
    <div className="qr-container flex justify-center">
      {/* High contrast wrapper with padding for quiet zone */}
      <div className="bg-white p-4 rounded-lg shadow-md inline-block">
        <QRCodeSVG
          value={token}
          size={size}
          level="M"           // Medium error correction (15%)
          marginSize={4}      // 4-module quiet zone
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
    </div>
  )
}

/**
 * Device Information Utilities
 * 
 * Functions to extract device and browser information from HTTP request headers.
 * Used for session tracking and security monitoring.
 */

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  device?: string;
  platform?: string;
}

/**
 * Parse User-Agent string to extract browser and OS information
 * Simple parser - for production, consider using a library like 'ua-parser-js'
 */
function parseUserAgent(userAgent: string): Omit<DeviceInfo, 'userAgent'> {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser: string | undefined;
  let browserVersion: string | undefined;
  
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = ua.match(/version\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (ua.includes('edg')) {
    browser = 'Edge';
    const match = ua.match(/edg\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
    const match = ua.match(/(?:opera|opr)\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  }
  
  // OS detection
  let os: string | undefined;
  let device: string | undefined;
  let platform: string | undefined;
  
  if (ua.includes('windows')) {
    os = 'Windows';
    if (ua.includes('windows nt 10.0')) {
      platform = 'Windows 10/11';
    } else if (ua.includes('windows nt 6.3')) {
      platform = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
      platform = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
      platform = 'Windows 7';
    } else {
      platform = 'Windows';
    }
    device = 'Desktop';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os = 'macOS';
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      platform = `macOS ${version}`;
    } else {
      platform = 'macOS';
    }
    device = 'Desktop';
  } else if (ua.includes('linux')) {
    os = 'Linux';
    platform = 'Linux';
    device = 'Desktop';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android ([\d.]+)/);
    platform = match ? `Android ${match[1]}` : 'Android';
    device = 'Mobile';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    const match = ua.match(/os ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      platform = `iOS ${version}`;
    } else {
      platform = 'iOS';
    }
    device = ua.includes('ipad') ? 'Tablet' : 'Mobile';
  }
  
  return {
    browser,
    browserVersion,
    os,
    device,
    platform,
  };
}

/**
 * Extract device information from request headers
 * 
 * @param req - Next.js API request object
 * @returns DeviceInfo object with parsed information
 */
export function getDeviceInfo(req: { headers: { [key: string]: string | string[] | undefined } }): DeviceInfo {
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown';
  const parsed = parseUserAgent(userAgent);
  
  return {
    userAgent,
    ...parsed,
  };
}

/**
 * Check if an IP address is localhost or private
 */
function isLocalOrPrivateIp(ip: string): boolean {
  if (!ip) return true;
  
  // Remove IPv6 brackets if present
  const cleanIp = ip.replace(/^\[|\]$/g, '');
  
  // Check for localhost
  if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp === 'localhost') {
    return true;
  }
  
  // Check for IPv4 private ranges
  if (cleanIp.startsWith('192.168.') || 
      cleanIp.startsWith('10.') || 
      cleanIp.startsWith('172.16.') || 
      cleanIp.startsWith('172.17.') || 
      cleanIp.startsWith('172.18.') || 
      cleanIp.startsWith('172.19.') || 
      cleanIp.startsWith('172.20.') || 
      cleanIp.startsWith('172.21.') || 
      cleanIp.startsWith('172.22.') || 
      cleanIp.startsWith('172.23.') || 
      cleanIp.startsWith('172.24.') || 
      cleanIp.startsWith('172.25.') || 
      cleanIp.startsWith('172.26.') || 
      cleanIp.startsWith('172.27.') || 
      cleanIp.startsWith('172.28.') || 
      cleanIp.startsWith('172.29.') || 
      cleanIp.startsWith('172.30.') || 
      cleanIp.startsWith('172.31.')) {
    return true;
  }
  
  // Check for IPv6 private/local ranges
  if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:')) {
    return true;
  }
  
  return false;
}

/**
 * Get IP address from request headers
 * Handles proxies, load balancers, and VPNs (Cloudflare, Heroku, Surfshark, etc.)
 * 
 * @param req - Next.js API request object
 * @returns IP address string (prefers public IP over localhost/private IPs)
 */
export function getIpAddress(req: { 
  headers: { [key: string]: string | string[] | undefined };
  socket?: { remoteAddress?: string };
}): string {
  const candidates: string[] = [];
  
  // 1. Check for CF-Connecting-IP (Cloudflare - most reliable)
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    const ip = Array.isArray(cfIp) ? cfIp[0] : cfIp;
    if (ip && !isLocalOrPrivateIp(ip)) {
      return ip.trim();
    }
    if (ip) candidates.push(ip.trim());
  }
  
  // 2. Check for X-Real-IP (common proxy header)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    if (ip && !isLocalOrPrivateIp(ip)) {
      return ip.trim();
    }
    if (ip) candidates.push(ip.trim());
  }
  
  // 3. Check for X-Forwarded-For (can contain multiple IPs)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ipList = ips.split(',').map(ip => ip.trim());
    
    // Find first public IP in the chain
    for (const ip of ipList) {
      if (!isLocalOrPrivateIp(ip)) {
        return ip;
      }
      candidates.push(ip);
    }
  }
  
  // 4. Check for other VPN/proxy headers
  const vpnHeaders = [
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
    'x-cluster-client-ip',
    'true-client-ip', // Some proxies use this
  ];
  
  for (const headerName of vpnHeaders) {
    const header = req.headers[headerName];
    if (header) {
      const ip = Array.isArray(header) ? header[0] : header;
      if (ip && !isLocalOrPrivateIp(ip)) {
        return ip.trim();
      }
      if (ip) candidates.push(ip.trim());
    }
  }
  
  // 5. Fallback to socket remote address (but prefer public IPs from candidates)
  const socketIp = req.socket?.remoteAddress;
  if (socketIp && !isLocalOrPrivateIp(socketIp)) {
    return socketIp;
  }
  
  // 6. If we have candidates but they're all local/private, return the first one
  // (in development, this is expected)
  if (candidates.length > 0) {
    return candidates[0];
  }
  
  // 7. Last resort: socket address (even if localhost)
  if (socketIp) {
    return socketIp;
  }
  
  return 'unknown';
}


import dns from 'node:dns';

// Prefer IPv4 results to avoid slow/failed IPv6 lookups on some networks (esp. Windows)
dns.setDefaultResultOrder('ipv4first');

/**
 * Returns where Netlify places the visitor by their IP address, so a first
 * visit can start with the nearest Resort (see docs/adr/0002). Nothing is stored.
 */

interface GeoContext {
    geo: { latitude?: number; longitude?: number };
}

export default (_request: Request, context: GeoContext): Response => {
    const { latitude = null, longitude = null } = context.geo;
    return Response.json({ latitude, longitude }, { headers: { 'Cache-Control': 'no-store' } });
};

export const config = { path: '/api/geo' };

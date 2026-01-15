import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getSuggestions } from './mapboxSearch';

describe('getSuggestions', () => {
  const sessionToken = 'session-token';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';
    vi.clearAllMocks();
  });

  it('prioritizes place results (city) before POIs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            name: 'Hotel ABC',
            mapbox_id: 'poi-1',
            place_formatted: 'Hotel ABC, Salt Lake City',
            feature_type: 'poi',
          },
          {
            name: 'Salt Lake City',
            mapbox_id: 'place-1',
            place_formatted: 'Salt Lake City, Utah, United States',
            feature_type: 'place',
          },
          {
            name: 'Salt Lake City International Airport',
            mapbox_id: 'poi-2',
            place_formatted: 'Salt Lake City International Airport',
            feature_type: 'poi',
          },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await getSuggestions('salt lake city', sessionToken, {
      limit: 5,
    });

    expect(results[0]).toMatchObject({
      name: 'Salt Lake City',
      mapboxId: 'place-1',
      featureType: 'place',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = (fetchMock.mock.calls[0] as any[])[0] as string;
    expect(calledUrl).toContain(
      'types=place%2Cregion%2Cpostcode%2Caddress%2Cpoi'
    );
  });
});

# Phase 1: Project Setup and Dependencies

## Overview

Set up the Next.js project with all required dependencies and configure the development environment.

## Tasks

### 1.1 Install Core Dependencies

```bash
npm install react-map-gl mapbox-gl
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
npm install @tanstack/react-query
npm install zod
```

### 1.2 Install UI Dependencies (ShadCN/ui)

```bash
npx shadcn@latest init
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add slider
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add label
npx shadcn@latest add badge
```

### 1.3 Environment Configuration

Create `.env.local` file:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

**Note**: Sign up for a free Mapbox account at https://account.mapbox.com/

### 1.4 TypeScript Interfaces

Create `/types/travel.ts`:

```typescript
export interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  name?: string;
}

export interface RouteData {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

export interface CostSettings {
  mpg: number;
  pricePerGallon: number;
}
```

### 1.5 Update next.config.ts

Add Mapbox webpack configuration:

```typescript
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'mapbox-gl/dist/mapbox-gl.js',
    };
    return config;
  },
};
```

## Acceptance Criteria

- [ ] All dependencies installed without errors
- [ ] ShadCN/ui components available
- [ ] Mapbox token configured
- [ ] TypeScript types defined
- [ ] Project builds successfully (`npm run dev`)

## Estimated Time

30-45 minutes
